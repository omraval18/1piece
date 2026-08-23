import { z } from "zod";

export const partKindSchema = z.enum(["nozzle", "hotend"]);
export type PartKind = z.infer<typeof partKindSchema>;

export const threadSchema = z.enum(["M6x1", "M6x0.75", "MK8", "other"]);
export type Thread = z.infer<typeof threadSchema>;

export const bodySchema = z.enum(["standard", "volcano", "supervolcano"]);
export type Body = z.infer<typeof bodySchema>;

export const materialSchema = z.enum([
  "brass",
  "hardened_steel",
  "plated_copper",
  "other",
]);
export type Material = z.infer<typeof materialSchema>;

export const throatSchema = z.enum(["ptfe_lined", "all_metal"]);
export type Throat = z.infer<typeof throatSchema>;

export const filamentSchema = z.union([z.literal(1.75), z.literal(2.85)]);
export type FilamentMm = z.infer<typeof filamentSchema>;

const missingable = {
  name: z.string().nullable(),
  thread: threadSchema.nullable(),
  body: bodySchema.nullable(),
  filament_diameter_mm: filamentSchema.nullable(),
  max_temp_c: z.number().nullable(),
  source_url: z.string().nullable(),
};

export const nozzleProfileSchema = z.object({
  kind: z.literal("nozzle"),
  ...missingable,
  thread_length_mm: z.number().nullable(),
  nozzle_diameter_mm: z.number().nullable(),
  material: materialSchema.nullable(),
});

export const hotendProfileSchema = z.object({
  kind: z.literal("hotend"),
  ...missingable,
  throat: throatSchema.nullable(),
  heater_voltage: z.enum(["12V", "24V"]).nullable(),
  heater_cartridge_mm: z.string().nullable(),
  thermistor_type: z.enum(["NTC100K", "PT1000", "other"]).nullable(),
});

export const deviceProfileSchema = z.discriminatedUnion("kind", [
  nozzleProfileSchema,
  hotendProfileSchema,
]);

export type NozzleProfile = z.infer<typeof nozzleProfileSchema>;
export type HotendProfile = z.infer<typeof hotendProfileSchema>;
export type DeviceProfile = z.infer<typeof deviceProfileSchema>;

export const MECHANICAL_FIELDS = ["thread", "filament_diameter_mm"] as const;

export function missingMechanicalFields(profile: DeviceProfile): string[] {
  return MECHANICAL_FIELDS.filter((field) => profile[field] == null);
}

/** One Studio collector, reused on every product URL. CLI description max 500 chars. */
export const COLLECTOR_NAME = "product-specs";

export const COLLECTOR_PROMPT = `Extract one hardware product as a single JSON object (not a list). Reused on many URLs. Fields: name, part_kind (nozzle, hotend, or other), thread (M6x1, M6x0.75, MK8, other), body (standard, volcano, supervolcano), throat (ptfe_lined, all_metal), thread_length_mm, nozzle_diameter_mm, max_temp_c, material, filament_diameter_mm, heater_voltage, heater_cartridge_mm, thermistor_type, source_url. Omit missing fields. Do not guess.`;
