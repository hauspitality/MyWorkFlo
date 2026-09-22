import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import type { Auth } from "googleapis";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Google Calendar integration (Phase 4): OAuth connect, freebusy-backed
 * availability, and event creation for booked appointments.
 *
 * Every read/write helper degrades gracefully: no env config, no active
 * connection, or any Google API error resolves to null so callers fall
 * back to simulated slots / skip the calendar write. Nothing here throws
 * except exchangeCodeAndStore (the OAuth callback wants the failure).
 *
 * Tokens are stored as-is in calendar_connections. App-layer encryption
 * before insert is a flagged Phase-7 item — the migration comment on
 * calendar_connections expects it; do not ship multi-tenant production
 * without it.
 */

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar"; // events + freebusy

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

function createOAuthClient(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

export function buildConnectUrl(state: string): string {
  return createOAuthClient().generateAuthUrl({
    // offline + consent forces a refresh_token even on re-connects.
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_SCOPE],
    state,
  });
}

// ============================================================================
// OAuth state signing — binds the connect redirect to the session's
// business/staff so the public callback can't be pointed at another tenant.
// The nonce doubles as a CSRF guard: connect mints it into both the signed
// state and an HttpOnly cookie, and the callback requires the two to match,
// so a state minted in an attacker's browser can't complete in a victim's.
// ============================================================================

export interface OAuthStatePayload {
  businessId: string;
  staffId: string | null;
  nonce: string;
}

const STATE_MAX_AGE_MS = 15 * 60_000;

export const OAUTH_NONCE_COOKIE = "gcal_oauth_nonce";
// Scoped to the callback path so the browser only ever sends it there.
export const OAUTH_NONCE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/api/calendar/google/callback",
  maxAge: STATE_MAX_AGE_MS / 1000,
} as const;

function stateSecret(): string {
  // Server-only secret that already exists in every environment; a
  // dedicated signing key would add config for no security gain here.
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function signStatePayload(encoded: string): string {
  return createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
}

export function createOAuthState(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString("base64url");
  return `${encoded}.${signStatePayload(encoded)}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(signStatePayload(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      businessId?: unknown;
      staffId?: unknown;
      nonce?: unknown;
      ts?: unknown;
    };
    if (typeof parsed.businessId !== "string") return null;
    if (typeof parsed.nonce !== "string" || !parsed.nonce) return null;
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > STATE_MAX_AGE_MS) return null;
    return {
      businessId: parsed.businessId,
      staffId: typeof parsed.staffId === "string" ? parsed.staffId : null,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Token exchange + connection storage
// ============================================================================

export async function exchangeCodeAndStore(params: {
  code: string;
  businessId: string;
  staffId: string | null;
}): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(params.code);
  if (!tokens.access_token && !tokens.refresh_token) {
    throw new Error("Google token exchange returned no usable tokens");
  }

  const db = createServiceClient();

  // One connection per business: replace any prior rows (active or not) so
  // the active-connection lookup below can rely on maybeSingle().
  await db.from("calendar_connections").delete().eq("business_id", params.businessId).eq("provider", "google");

  const { error } = await db.from("calendar_connections").insert({
    business_id: params.businessId,
    provider: "google",
    calendar_id: "primary",
    // Stored unencrypted — Phase-7 flagged item, see module comment.
    access_token: tokens.access_token ?? null,
    refresh_token: tokens.refresh_token ?? null,
    status: "active",
    connected_by: params.staffId,
  });
  if (error) throw new Error(`Failed to store calendar connection: ${error.message}`);
}

// ============================================================================
// Authed client per business
// ============================================================================

interface AuthedConnection {
  client: Auth.OAuth2Client;
  connectionId: string;
  calendarId: string;
}

async function getAuthedClientForBusiness(businessId: string): Promise<AuthedConnection | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const db = createServiceClient();
  const { data: connection } = await db
    .from("calendar_connections")
    .select("id, calendar_id, access_token, refresh_token")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("status", "active")
    .maybeSingle();

  if (!connection || (!connection.access_token && !connection.refresh_token)) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  });

  // googleapis refreshes the access token on demand from the refresh_token
  // and emits 'tokens' when it does — persist so future calls skip the
  // refresh round-trip. Fire-and-forget: a failed persist only costs that.
  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void db
      .from("calendar_connections")
      .update({
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      })
      .eq("id", connection.id)
      .then(undefined, () => {});
  });

  return { client, connectionId: connection.id, calendarId: connection.calendar_id ?? "primary" };
}

function isInvalidGrant(err: unknown): boolean {
  const e = err as { message?: unknown; response?: { data?: { error?: unknown } } };
  if (e?.response?.data?.error === "invalid_grant") return true;
  return typeof e?.message === "string" && e.message.includes("invalid_grant");
}

/** invalid_grant means the user revoked access — flag it so the dashboard can prompt a re-connect. */
async function markConnectionRevoked(connectionId: string): Promise<void> {
  const db = createServiceClient();
  await db.from("calendar_connections").update({ status: "revoked" }).eq("id", connectionId);
}

// ============================================================================
// Freebusy + event creation
// ============================================================================

export async function getBusySlots(params: {
  businessId: string;
  timeMinIso: string;
  timeMaxIso: string;
}): Promise<Array<{ start: string; end: string }> | null> {
  let authed: AuthedConnection | null = null;
  try {
    authed = await getAuthedClientForBusiness(params.businessId);
    if (!authed) return null;

    const calendar = google.calendar({ version: "v3", auth: authed.client });
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMinIso,
        timeMax: params.timeMaxIso,
        items: [{ id: authed.calendarId }],
      },
    });

    const busy = res.data.calendars?.[authed.calendarId]?.busy ?? [];
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: b.start, end: b.end }));
  } catch (err) {
    if (authed && isInvalidGrant(err)) await markConnectionRevoked(authed.connectionId).catch(() => {});
    return null;
  }
}

/**
 * PINNED CONTRACT — imported by lib/approvals/resolve.ts and
 * lib/messaging/process-inbound.ts. Returns the created event id, or null
 * when no connection exists or anything fails. Never throws: a calendar
 * write must never break a booking that's already in the database.
 */
export async function createCalendarEventIfConnected(params: {
  businessId: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
}): Promise<string | null> {
  let authed: AuthedConnection | null = null;
  try {
    authed = await getAuthedClientForBusiness(params.businessId);
    if (!authed) return null;

    const calendar = google.calendar({ version: "v3", auth: authed.client });
    const res = await calendar.events.insert({
      calendarId: authed.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startIso },
        end: { dateTime: params.endIso },
      },
    });

    return res.data.id ?? null;
  } catch (err) {
    if (authed && isInvalidGrant(err)) await markConnectionRevoked(authed.connectionId).catch(() => {});
    return null;
  }
}
