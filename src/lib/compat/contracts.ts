import { z } from "zod";

export const partProfileSchema = z.object({
  name: z.string().nullable(),
  category: z.string().nullable(),
  specs: z.record(z.string(), z.union([z.string(), z.number()])),
  source_url: z.string().nullable(),
});

export type PartProfile = z.infer<typeof partProfileSchema>;

/** One Studio collector, reused on every product URL. CLI description max 500 chars. */
export const COLLECTOR_NAME = "product-specs";

export const COLLECTOR_PROMPT = `Extract one product as a single JSON object (not a list). Reused on many kinds of product pages. Fields: name, category (what kind of part or product this is, in a couple of words), source_url, and any other spec fields present on the page as flat key-value pairs (dimensions, ratings, materials, connectors, voltages, capacities, thread sizes, etc. — whatever the page actually lists). Omit fields that are not present. Do not guess.`;
