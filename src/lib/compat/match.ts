import type { DeviceProfile, HotendProfile, NozzleProfile } from "./contracts";
import { missingMechanicalFields } from "./contracts";

export const PTFE_LIMIT_C = 250;

export type CompatResult = "compatible" | "incompatible" | "unclear";

export type Verdict = {
  result: CompatResult;
  reasoning: string;
  decisive_fields: string[];
  profile_a: DeviceProfile;
  profile_b: DeviceProfile;
  sources: { url: string; part: "a" | "b" }[];
};

function pair(a: DeviceProfile, b: DeviceProfile): {
  nozzle: NozzleProfile | null;
  hotend: HotendProfile | null;
} {
  if (a.kind === "nozzle" && b.kind === "hotend") return { nozzle: a, hotend: b };
  if (a.kind === "hotend" && b.kind === "nozzle") return { nozzle: b, hotend: a };
  return { nozzle: null, hotend: null };
}

function sources(a: DeviceProfile, b: DeviceProfile): Verdict["sources"] {
  const out: Verdict["sources"] = [];
  if (a.source_url) out.push({ url: a.source_url, part: "a" });
  if (b.source_url) out.push({ url: b.source_url, part: "b" });
  return out;
}

export function compareDevices(a: DeviceProfile, b: DeviceProfile): Verdict {
  const { nozzle, hotend } = pair(a, b);
  if (!nozzle || !hotend) {
    return {
      result: "unclear",
      reasoning:
        "Compatibility here is nozzle ↔ hotend. Two nozzles or two hotends cannot be scored.",
      decisive_fields: ["kind"],
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  const decisive: string[] = [];

  if (nozzle.thread && hotend.thread && nozzle.thread !== hotend.thread) {
    decisive.push("thread");
    return {
      result: "incompatible",
      reasoning: `Thread mismatch: nozzle is ${nozzle.thread}, hotend accepts ${hotend.thread}. It will not screw in.`,
      decisive_fields: decisive,
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  if (
    nozzle.filament_diameter_mm &&
    hotend.filament_diameter_mm &&
    nozzle.filament_diameter_mm !== hotend.filament_diameter_mm
  ) {
    decisive.push("filament_diameter_mm");
    return {
      result: "incompatible",
      reasoning: `Filament path mismatch: nozzle is ${nozzle.filament_diameter_mm} mm, hotend is ${hotend.filament_diameter_mm} mm.`,
      decisive_fields: decisive,
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  if (nozzle.body && hotend.body && nozzle.body !== hotend.body) {
    decisive.push("body");
    return {
      result: "incompatible",
      reasoning: `Heater-block geometry mismatch: nozzle body is ${nozzle.body}, hotend body is ${hotend.body}. Volcano-length and standard nozzles are not interchangeable.`,
      decisive_fields: decisive,
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  if (
    hotend.throat === "ptfe_lined" &&
    nozzle.max_temp_c != null &&
    nozzle.max_temp_c >= 300
  ) {
    decisive.push("throat", "max_temp_c");
    return {
      result: "incompatible",
      reasoning: `Nozzle is rated ${nozzle.max_temp_c} °C but the hotend is PTFE-lined. PTFE degrades around ${PTFE_LIMIT_C} °C, so this combo will not run at the temps the nozzle is sold for.`,
      decisive_fields: decisive,
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  const missing = [
    ...missingMechanicalFields(nozzle).map((f) => `nozzle.${f}`),
    ...missingMechanicalFields(hotend).map((f) => `hotend.${f}`),
  ];
  if (missing.length) {
    return {
      result: "unclear",
      reasoning: `Not enough extracted specs to decide mechanical fit. Missing: ${missing.join(", ")}.`,
      decisive_fields: missing,
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  const notes: string[] = [
    `Thread ${nozzle.thread} matches.`,
    `Filament ${nozzle.filament_diameter_mm} mm matches.`,
  ];
  decisive.push("thread", "filament_diameter_mm");
  if (nozzle.body && hotend.body) {
    notes.push(`Body ${nozzle.body} matches the heater block.`);
    decisive.push("body");
  }
  if (hotend.throat) {
    notes.push(`Throat is ${hotend.throat}.`);
    decisive.push("throat");
  }

  return {
    result: "compatible",
    reasoning: notes.join(" "),
    decisive_fields: [...new Set(decisive)],
    profile_a: a,
    profile_b: b,
    sources: sources(a, b),
  };
}
