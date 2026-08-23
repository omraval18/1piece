import { tool } from "ai";
import { z } from "zod";
import { extractDevice } from "@/lib/compat/extract";
import { discoverSpecPages } from "@/lib/compat/discover";
import { compareByQuery, compareByUrls } from "@/lib/compat/pipeline";
import { isUsableProfile } from "@/lib/compat/normalize";

function fail(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Tool failed",
  };
}

const urlSchema = z.string().url();

export const chatTools = {
  discoverSpecUrls: tool({
    description:
      "Find official spec/product pages for any hardware product, from any manufacturer — not a fixed brand list. Uses Bright Data's AI-ranked web discovery. Call this before scraping unless the user already pasted a URL.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .describe("Product name as the user said it, e.g. Sony A7 IV, E3D V6 nozzle, Anker 65W charger"),
    }),
    execute: async (input) => {
      try {
        return await discoverSpecPages(input);
      } catch (error) {
        return fail(error);
      }
    },
  }),
  scrapeSpecs: tool({
    description:
      "Run the pinned product-specs Scraper Studio collector on one page URL (from discoverSpecUrls or pasted by the user). Returns a normalized spec profile for any kind of product. Do not invent specs.",
    inputSchema: z.object({
      url: urlSchema.describe("Manufacturer or wiki spec page URL"),
    }),
    execute: async ({ url }) => {
      try {
        const result = await extractDevice({ url, preferLive: true });
        return {
          mode: result.mode,
          collectorId: result.collectorId,
          extraction: result.extraction,
          profile: result.profile,
          usable: isUsableProfile(result.profile),
          spec_keys: Object.keys(result.profile.specs),
        };
      } catch (error) {
        return fail(error);
      }
    },
  }),
  checkCompatibility: tool({
    description:
      "Judge whether two hardware products work together, any category (CPU/motherboard, RAM/board, GPU/PSU, camera/lens, charger/phone, etc.). Prefer product names so this discovers + scrapes itself. Pass question as the user's full ask including BIOS, firmware, AF, power, and similar caveats.",
    inputSchema: z
      .object({
        deviceQuery: z.string().optional().describe("First product as named by the user"),
        candidateQuery: z
          .string()
          .optional()
          .describe("Second product as named by the user"),
        question: z
          .string()
          .optional()
          .describe("The user's full compatibility question, including any caveats"),
        deviceUrl: urlSchema.optional(),
        candidateUrls: z.array(urlSchema).min(1).max(5).optional(),
      })
      .refine(
        (value) =>
          (Boolean(value.deviceQuery) && Boolean(value.candidateQuery)) ||
          (Boolean(value.deviceUrl) && Boolean(value.candidateUrls?.length)),
        {
          message:
            "Pass deviceQuery+candidateQuery or deviceUrl+candidateUrls.",
        },
      ),
    execute: async (input) => {
      try {
        if (input.deviceQuery && input.candidateQuery) {
          return await compareByQuery({
            deviceQuery: input.deviceQuery,
            candidateQuery: input.candidateQuery,
            question: input.question,
          });
        }
        return await compareByUrls({
          deviceUrl: input.deviceUrl!,
          candidateUrls: input.candidateUrls!,
          question: input.question,
        });
      } catch (error) {
        return fail(error);
      }
    },
  }),
};
