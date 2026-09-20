import type { IssueUrgency } from "@/lib/supabase/types";

/**
 * Platform-owned HVAC symptom taxonomy. This is what makes the AI engine
 * "speak HVAC" instead of being a generic customer-service bot — it drives
 * both the qualifying-question flow and (for the emergency-tagged codes)
 * feeds the deterministic pre-filter in emergencySignals.ts.
 *
 * Not tenant-editable. Mirrors the seed data in
 * supabase/seed/hvac_issue_types.sql — keep the two in sync.
 */

export type RequiredField =
  | "symptom_onset"
  | "equipment_type"
  | "equipment_age_or_brand"
  | "error_codes_or_lights"
  | "anyone_home_now"
  | "service_address"
  | "preferred_time_window"
  | "square_footage";

export interface HvacIssueType {
  code: string;
  label: string;
  aliasesEn: string[];
  aliasesEs: string[];
  defaultUrgency: IssueUrgency;
  seasonalSensitive: boolean;
  requiredFields: RequiredField[];
}

export const EQUIPMENT_TYPES = [
  "central_split_system",
  "heat_pump",
  "mini_split_ductless",
  "furnace_gas",
  "furnace_electric",
  "packaged_rooftop_unit",
  "boiler",
  "geothermal",
  "window_unit",
  "not_sure",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

const STANDARD_FIELDS: RequiredField[] = [
  "symptom_onset",
  "equipment_type",
  "anyone_home_now",
  "service_address",
  "preferred_time_window",
];

export const HVAC_ISSUE_TYPES: HvacIssueType[] = [
  {
    code: "NO_COOLING",
    label: "No cooling",
    aliasesEn: ["ac not working", "no cold air", "ac stopped", "not cooling", "ac is out", "air conditioner broken"],
    aliasesEs: ["no enfría", "no hay aire frío", "el aire no funciona", "se dañó el aire acondicionado"],
    defaultUrgency: "priority",
    seasonalSensitive: true,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "NO_HEAT",
    label: "No heat",
    aliasesEn: ["heat not working", "no heat", "furnace stopped", "not heating", "heater is out"],
    aliasesEs: ["no calienta", "no hay calefacción", "se dañó la calefacción"],
    defaultUrgency: "priority",
    seasonalSensitive: true,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "POOR_AIRFLOW",
    label: "Weak airflow",
    aliasesEn: ["weak airflow", "barely any air", "low airflow", "not much air coming out"],
    aliasesEs: ["poco aire", "el aire sale débil"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "STRANGE_NOISE",
    label: "Strange noise",
    aliasesEn: ["weird noise", "loud noise", "banging", "screeching", "rattling"],
    aliasesEs: ["hace un ruido raro", "ruido extraño", "hace ruido"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: [...STANDARD_FIELDS, "equipment_age_or_brand"],
  },
  {
    code: "WATER_LEAK",
    label: "Water leak",
    aliasesEn: ["water leaking", "water pooling", "leaking near the unit", "water on the floor"],
    aliasesEs: ["hay una fuga de agua", "se está saliendo agua", "agua en el piso"],
    defaultUrgency: "priority",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "ICE_ON_UNIT",
    label: "Ice on the unit",
    aliasesEn: ["ice on the unit", "frozen coil", "ice buildup", "unit is frozen"],
    aliasesEs: ["se está congelando la unidad", "hay hielo en la unidad"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "THERMOSTAT_ISSUE",
    label: "Thermostat issue",
    aliasesEn: ["thermostat blank", "thermostat not working", "thermostat is off"],
    aliasesEs: ["el termostato no funciona", "el termostato está apagado"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: [...STANDARD_FIELDS, "error_codes_or_lights"],
  },
  {
    code: "ELECTRICAL_BREAKER",
    label: "Tripped breaker / no power",
    aliasesEn: ["breaker tripped", "no power to the unit", "keeps tripping the breaker"],
    aliasesEs: ["se disparó el breaker", "no tiene electricidad la unidad"],
    defaultUrgency: "priority",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "SHORT_CYCLING",
    label: "Turns on and off repeatedly",
    aliasesEn: ["turns on and off", "short cycling", "keeps shutting off"],
    aliasesEs: ["se apaga y prende seguido", "se enciende y apaga solo"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "TUNE_UP_MAINTENANCE",
    label: "Tune-up / maintenance",
    aliasesEn: ["tune up", "maintenance visit", "annual service", "checkup"],
    aliasesEs: ["mantenimiento", "revisión anual", "servicio de mantenimiento"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: ["equipment_type", "service_address", "preferred_time_window"],
  },
  {
    code: "REPLACEMENT_ESTIMATE",
    label: "Replacement estimate",
    aliasesEn: ["need a new unit", "replacement estimate", "quote for a new system", "want to replace"],
    aliasesEs: ["necesito un sistema nuevo", "cotización para reemplazo"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: ["equipment_age_or_brand", "square_footage", "service_address", "preferred_time_window"],
  },
  {
    code: "INDOOR_AIR_QUALITY",
    label: "Air quality / filtration",
    aliasesEn: ["air quality", "humidifier", "duct cleaning", "air filter"],
    aliasesEs: ["calidad del aire", "limpieza de ductos", "filtro de aire"],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "WARRANTY_CALLBACK",
    label: "Warranty / recent-work callback",
    aliasesEn: ["same problem again", "you just fixed this", "still not working after the repair"],
    aliasesEs: ["sigue igual después de la reparación", "el mismo problema otra vez"],
    defaultUrgency: "priority",
    seasonalSensitive: false,
    requiredFields: STANDARD_FIELDS,
  },
  {
    code: "BURNING_SMELL_ELECTRICAL",
    label: "Burning/electrical smell",
    aliasesEn: ["burning smell", "smells like something is burning", "electrical smell"],
    aliasesEs: ["huele a quemado", "olor a quemado"],
    defaultUrgency: "emergency",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
  {
    code: "GAS_SMELL",
    label: "Gas smell",
    aliasesEn: ["smell gas", "gas smell", "rotten egg smell", "smells like gas"],
    aliasesEs: ["huele a gas", "olor a gas", "huele a azufre"],
    defaultUrgency: "emergency",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
  {
    code: "CARBON_MONOXIDE_CONCERN",
    label: "Carbon monoxide concern",
    aliasesEn: ["co alarm", "carbon monoxide detector going off", "co detector"],
    aliasesEs: ["detector de monóxido", "alarma de monóxido de carbono"],
    defaultUrgency: "emergency",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
  {
    code: "SPARKING_ELECTRICAL",
    label: "Sparking / smoking electrical",
    aliasesEn: ["sparks", "sparking", "smoke coming from the unit", "outlet smoking"],
    aliasesEs: ["chispas", "sale humo", "el enchufe está humeando"],
    defaultUrgency: "emergency",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
  {
    code: "FLOODING_NEAR_ELECTRICAL",
    label: "Flooding near electrical",
    aliasesEn: ["flooded near the breaker", "water near the panel", "flooding by the electrical"],
    aliasesEs: ["se inundó cerca del panel eléctrico", "agua cerca del breaker"],
    defaultUrgency: "emergency",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
  {
    code: "UNKNOWN_OTHER",
    label: "Unclear / other",
    aliasesEn: [],
    aliasesEs: [],
    defaultUrgency: "routine",
    seasonalSensitive: false,
    requiredFields: ["service_address"],
  },
];

export const EMERGENCY_ISSUE_CODES = new Set(
  HVAC_ISSUE_TYPES.filter((issue) => issue.defaultUrgency === "emergency").map((issue) => issue.code),
);

export function getIssueType(code: string): HvacIssueType | undefined {
  return HVAC_ISSUE_TYPES.find((issue) => issue.code === code);
}

export function isEmergencyCode(code: string): boolean {
  return EMERGENCY_ISSUE_CODES.has(code);
}
