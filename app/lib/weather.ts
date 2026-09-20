import "server-only";

/**
 * Live outdoor temperature by US zip, via the free National Weather
 * Service API (no key required). Used to boost urgency on NO_COOLING/
 * NO_HEAT calls during genuine extremes (a cold snap in April, an early
 * heat wave) rather than a static "June = summer" heuristic that would
 * miss anomalies.
 *
 * This is a nice-to-have severity signal, not a critical path: any
 * failure anywhere in the chain returns null, and callers must treat null
 * as "skip the weather question" rather than blocking the conversation.
 *
 * NWS doesn't accept zip codes directly, so this chains three calls:
 * zip -> lat/lon (zippopotam.us) -> forecast gridpoint (api.weather.gov)
 * -> nearest station's latest observation.
 */

const USER_AGENT = "(myworkflo.com, support@myworkflo.com)";

// In-memory best-effort cache. On serverless this only helps within a warm
// instance — that's fine, it's a latency/politeness optimization, not a
// correctness requirement.
const cache = new Map<string, { tempF: number | null; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function zipToLatLon(zip: string): Promise<{ lat: number; lon: number } | null> {
  const data = (await fetchJson(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`)) as
    | { places?: Array<{ latitude: string; longitude: string }> }
    | null;
  const place = data?.places?.[0];
  if (!place) return null;
  return { lat: parseFloat(place.latitude), lon: parseFloat(place.longitude) };
}

async function getNearestStationId(lat: number, lon: number): Promise<string | null> {
  const points = (await fetchJson(`https://api.weather.gov/points/${lat},${lon}`)) as
    | { properties?: { observationStations?: string } }
    | null;
  const stationsUrl = points?.properties?.observationStations;
  if (!stationsUrl) return null;

  const stations = (await fetchJson(stationsUrl)) as
    | { features?: Array<{ properties?: { stationIdentifier?: string } }> }
    | null;
  return stations?.features?.[0]?.properties?.stationIdentifier ?? null;
}

async function getLatestTempF(stationId: string): Promise<number | null> {
  const obs = (await fetchJson(`https://api.weather.gov/stations/${stationId}/observations/latest`)) as
    | { properties?: { temperature?: { value?: number | null } } }
    | null;
  const celsius = obs?.properties?.temperature?.value;
  if (celsius === null || celsius === undefined) return null;
  return Math.round((celsius * 9) / 5 + 32);
}

export async function getOutdoorTempF(zip: string): Promise<number | null> {
  const cached = cache.get(zip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tempF;
  }

  const coords = await zipToLatLon(zip);
  const stationId = coords ? await getNearestStationId(coords.lat, coords.lon) : null;
  const tempF = stationId ? await getLatestTempF(stationId) : null;

  cache.set(zip, { tempF, expiresAt: Date.now() + CACHE_TTL_MS });
  return tempF;
}

export interface WeatherThresholds {
  no_cooling_high_f: number;
  no_heat_low_f: number;
}

/**
 * Returns whether the given issue code + zip currently crosses the
 * business's configured weather threshold. Returns false (not "unknown")
 * on any lookup failure — silently skipping the vulnerability question is
 * the correct fail-safe, not blocking or erroring the conversation.
 */
export async function isWeatherElevated(
  issueCode: "NO_COOLING" | "NO_HEAT",
  zip: string,
  thresholds: WeatherThresholds,
): Promise<boolean> {
  const tempF = await getOutdoorTempF(zip);
  if (tempF === null) return false;

  if (issueCode === "NO_COOLING") return tempF >= thresholds.no_cooling_high_f;
  return tempF <= thresholds.no_heat_low_f;
}
