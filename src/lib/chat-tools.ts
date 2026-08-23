import { tool } from "ai";
import { z } from "zod";
import { listCatalog } from "@/lib/compat/catalog";
import { extractDevice } from "@/lib/compat/extract";
import { findCompatibleParts } from "@/lib/compat/pipeline";

const partInput = z.object({
  catalogId: z
    .string()
    .optional()
    .describe("Catalog part id, e.g. e3d-v6-brass-04"),
  url: z.string().optional().describe("Public manufacturer or wiki spec URL"),
  kind: z.enum(["nozzle", "hotend"]).optional(),
});

export const chatTools = {
  listParts: tool({
    description:
      "List catalog 3D-printer nozzles and hotends that can be used as lookup ids.",
    inputSchema: z.object({}),
    execute: async () => listCatalog(),
  }),
  extractPart: tool({
    description:
      "Extract a structured device profile from a catalog id or product URL via Scraper Studio (or fixtures).",
    inputSchema: partInput,
    execute: async ({ catalogId, url, kind }) => {
      const result = await extractDevice({ catalogId, url, kind });
      return {
        mode: result.mode,
        collectorId: result.collectorId,
        profile: result.profile,
      };
    },
  }),
  findCompatibleParts: tool({
    description:
      "Given a nozzle or hotend, return counterpart parts with compatible / incompatible / unclear verdicts and cited fields.",
    inputSchema: partInput,
    execute: async ({ catalogId, url, kind }) => {
      const result = await findCompatibleParts({ catalogId, url, kind });
      return {
        mode: result.mode,
        query: result.query.profile,
        matches: result.matches.map((match) => ({
          id: match.id,
          label: match.label,
          url: match.url,
          result: match.verdict.result,
          reasoning: match.verdict.reasoning,
          decisive_fields: match.verdict.decisive_fields,
        })),
      };
    },
  }),
};
