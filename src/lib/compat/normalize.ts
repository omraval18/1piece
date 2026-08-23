import type {
  Body,
  DeviceProfile,
  FilamentMm,
  HotendProfile,
  Material,
  NozzleProfile,
  PartKind,
  Thread,
  Throat,
} from "./contracts";

function asRecord(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) {
    const first = raw.find((item) => item && typeof item === "object");
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : {};
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export function inferPartKind(
  raw: unknown,
  fallback?: PartKind,
): PartKind | undefined {
  const obj = asRecord(raw);
  const value = pick(obj, ["part_kind", "kind", "type", "product_type"]);
  if (value != null) {
    const text = String(value).toLowerCase();
    if (text.includes("nozzle")) return "nozzle";
    if (text.includes("hotend") || text.includes("hot-end") || text.includes("hot end")) {
      return "hotend";
    }
  }
  const name = String(pick(obj, ["name", "title", "product_name"]) ?? "");
  if (/nozzle/i.test(name)) return "nozzle";
  if (/hotend|hot-end|hot end/i.test(name)) return "hotend";
  return fallback;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    const nums = value
      .map((item) => toNumber(item))
      .filter((n): n is number => n != null);
    if (nums.includes(0.4)) return 0.4;
    const orifice = nums.find((n) => n > 0 && n < 1.5);
    return orifice ?? nums[0] ?? null;
  }
  if (typeof value !== "string") return null;
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeTempC(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = toNumber(value);
  if (n == null) return null;
  const text = String(value).toLowerCase();
  if (text.includes("f") && !text.includes("c")) {
    return Math.round(((n - 32) * 5) / 9);
  }
  return n;
}

const THREAD_ALIASES: Array<[RegExp, Thread]> = [
  [/\bm6\s*[x×*]\s*0\s*\.?\s*75\b/i, "M6x0.75"],
  [/\bm6\s*[x×*]\s*1(\.0)?\b/i, "M6x1"],
  [/\bm6\b/i, "M6x1"],
  [/\bmk-?8\b/i, "MK8"],
  [/\bcr-?10\b/i, "MK8"],
];

export function normalizeThread(value: unknown): Thread | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  for (const [re, thread] of THREAD_ALIASES) {
    if (re.test(text)) return thread;
  }
  if (/^other$/i.test(text)) return "other";
  return "other";
}

export function normalizeBody(value: unknown): Body | null {
  if (value == null || value === "") return null;
  const text = String(value).toLowerCase();
  if (text.includes("supervolcano")) return "supervolcano";
  if (text.includes("volcano")) return "volcano";
  if (text.includes("standard") || text.includes("v6") || text.includes("mk8")) {
    return "standard";
  }
  return null;
}

export function normalizeMaterial(value: unknown): Material | null {
  if (value == null || value === "") return null;
  const text = String(value).toLowerCase();
  if (text.includes("plated") || text.includes("copper")) return "plated_copper";
  if (text.includes("hardened") || text.includes("steel")) return "hardened_steel";
  if (text.includes("brass")) return "brass";
  return "other";
}

export function normalizeThroat(value: unknown): Throat | null {
  if (value == null || value === "") return null;
  const text = String(value).toLowerCase();
  if (text.includes("ptfe") || text.includes("teflon") || text.includes("lined")) {
    return "ptfe_lined";
  }
  if (text.includes("all") && text.includes("metal")) return "all_metal";
  if (text.includes("all-metal") || text.includes("allmetal")) return "all_metal";
  return null;
}

export function normalizeFilament(value: unknown): FilamentMm | null {
  if (typeof value === "string") {
    if (/1\.75/.test(value)) return 1.75;
    if (/2\.85/.test(value)) return 2.85;
    const stripped = value.replace(/mm/gi, "").trim();
    if (/[a-z]/i.test(stripped)) return null;
    const n = toNumber(value);
    if (n == null) return null;
    if (Math.abs(n - 1.75) < 0.2) return 1.75;
    if (Math.abs(n - 2.85) < 0.2 || Math.abs(n - 3) < 0.05) return 2.85;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = normalizeFilament(item);
      if (found) return found;
    }
    return null;
  }
  const n = toNumber(value);
  if (n == null) return null;
  if (Math.abs(n - 1.75) < 0.2) return 1.75;
  if (Math.abs(n - 2.85) < 0.2 || Math.abs(n - 3) < 0.05) return 2.85;
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeDevice(
  raw: unknown,
  kind: PartKind,
  sourceUrl: string,
): DeviceProfile {
  const obj = asRecord(raw);
  const name =
    asString(pick(obj, ["name", "product_name", "title", "model"])) ?? null;
  const blob = [name, JSON.stringify(obj)].join(" ");
  const thread =
    normalizeThread(
      pick(obj, ["thread", "thread_type", "nozzle_thread", "threadType"]),
    ) ?? (/\bv6\b/i.test(blob) ? "M6x1" : null);
  const body =
    normalizeBody(pick(obj, ["body", "body_type", "heater_block", "style"])) ??
    (kind === "nozzle" && /volcano/i.test(blob) ? "volcano" : null);
  const filament_diameter_mm =
    normalizeFilament(
      pick(obj, [
        "filament_diameter_mm",
        "filament_diameter",
        "filament",
        "filamentDiameter",
      ]),
    ) ??
    normalizeFilament(name) ??
    normalizeFilament(
      pick(obj, ["nozzle_diameter_mm", "orifice", "diameter_mm"]),
    );
  const max_temp_c = normalizeTempC(
    pick(obj, ["max_temp_c", "max_temp", "max_temperature", "temperature", "temp"]),
  );
  const source_url =
    asString(pick(obj, ["source_url", "url", "page_url"])) ?? sourceUrl;

  const shared = {
    name,
    thread,
    body,
    filament_diameter_mm,
    max_temp_c,
    source_url,
  };

  if (kind === "nozzle") {
    const profile: NozzleProfile = {
      kind: "nozzle",
      ...shared,
      thread_length_mm: toNumber(
        pick(obj, ["thread_length_mm", "thread_length", "length_mm"]),
      ),
      nozzle_diameter_mm: toNumber(
        pick(obj, ["nozzle_diameter_mm", "orifice", "diameter_mm", "size_mm"]),
      ),
      material: normalizeMaterial(
        pick(obj, ["material", "nozzle_material", "construction"]),
      ),
    };
    return profile;
  }

  const voltageRaw = pick(obj, ["heater_voltage", "voltage"]) ?? name;
  let heater_voltage: "12V" | "24V" | null = null;
  if (voltageRaw != null) {
    const v = String(voltageRaw);
    if (/\b24\s*v\b/i.test(v) || v.includes("24V")) heater_voltage = "24V";
    else if (/\b12\s*v\b/i.test(v) || v.includes("12V")) heater_voltage = "12V";
  }

  const thermistorRaw = asString(
    pick(obj, ["thermistor_type", "thermistor", "sensor"]),
  );
  let thermistor_type: HotendProfile["thermistor_type"] = null;
  if (thermistorRaw) {
    if (/pt1000/i.test(thermistorRaw)) thermistor_type = "PT1000";
    else if (/ntc|100k/i.test(thermistorRaw)) thermistor_type = "NTC100K";
    else thermistor_type = "other";
  }

  const profile: HotendProfile = {
    kind: "hotend",
    ...shared,
    throat:
      normalizeThroat(
        pick(obj, ["throat", "throat_type", "heatbreak", "liner"]),
      ) ?? normalizeThroat(name),
    heater_voltage,
    heater_cartridge_mm: asString(
      pick(obj, ["heater_cartridge_mm", "heater", "cartridge"]),
    ),
    thermistor_type,
  };
  return profile;
}
