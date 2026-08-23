import { generateObject } from "ai";
import { z } from "zod";
import type { PartProfile } from "./contracts";
import { minimax, minimaxModelId } from "@/lib/minimax";

export type CompatResult = "compatible" | "incompatible" | "conditional" | "unclear";

export type Verdict = {
  result: CompatResult;
  reasoning: string;
  decisive_fields: string[];
  profile_a: PartProfile;
  profile_b: PartProfile;
  sources: { url: string; part: "a" | "b" }[];
};

const verdictSchema = z.object({
  result: z.enum(["compatible", "incompatible", "conditional", "unclear"]),
  reasoning: z.string(),
  decisive_fields: z
    .array(z.string())
    .describe("Exact spec keys from either profile's `specs` object that drove the answer. Use page_text if that is where the fact appeared."),
});

function sources(a: PartProfile, b: PartProfile): Verdict["sources"] {
  const out: Verdict["sources"] = [];
  if (a.source_url) out.push({ url: a.source_url, part: "a" });
  if (b.source_url) out.push({ url: b.source_url, part: "b" });
  return out;
}

/**
 * Two structured, already-normalized profiles go in; a cited verdict comes
 * out. There is no code-level rule table here on purpose — profiles are
 * freeform spec bags for arbitrary parts, so "does this match" is a judgment
 * call the model has to make from the actual extracted fields, not something
 * a fixed `a.thread === b.thread` check could ever generalize to.
 */
export async function compareParts(
  a: PartProfile,
  b: PartProfile,
  question?: string,
): Promise<Verdict> {
  if (Object.keys(a.specs).length === 0 || Object.keys(b.specs).length === 0) {
    return {
      result: "unclear",
      reasoning:
        "One or both parts have no extracted specs to compare, so fit can't be scored.",
      decisive_fields: [],
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  if (!process.env.MINIMAX_API_KEY) {
    return {
      result: "unclear",
      reasoning: "Set MINIMAX_API_KEY to enable AI-scored compatibility checks.",
      decisive_fields: [],
      profile_a: a,
      profile_b: b,
      sources: sources(a, b),
    };
  }

  const { object } = await generateObject({
    model: minimax.chatModel(minimaxModelId),
    schema: verdictSchema,
    system: `You judge hardware compatibility for ANY category (CPU↔motherboard, RAM↔board, GPU↔PSU, camera↔lens, flash↔body, nozzle↔hotend, charger↔phone, dock↔laptop, transceiver↔switch, etc.).
Compare part_a and part_b using only their extracted profiles. specs may include a long page_text field from the official page — treat that as evidence too.
Answer every aspect the user asked (physical fit, electrical, protocol, firmware/BIOS, AF, stabilization, power, etc.).
result:
- compatible: all asked aspects are supported by the extracted evidence
- conditional: works only with a stated BIOS/firmware/adapter/setting that IS in the evidence
- incompatible: evidence shows a hard mismatch
- unclear: a required fact is missing from both profiles — say exactly which fact
Never invent sockets, BIOS versions, mounts, wattage, or firmware numbers.
decisive_fields must be exact keys from specs (page_text is allowed).
JSON only: {"result":"...","reasoning":"...","decisive_fields":["..."]}`,
    prompt: JSON.stringify({
      question: question || "Are these two parts compatible?",
      part_a: a,
      part_b: b,
    }),
    // This provider doesn't support real structured-output/json_schema mode
    // (confirmed: response_format is undocumented and ignored), so
    // generateObject falls back to prompting for JSON and parsing raw text.
    // MiniMax-M3 defaults to a reasoning pass that wraps the answer in
    // <think> tags and prose; disabling it and repairing anything that still
    // leaks through keeps this from breaking on that.
    providerOptions: {
      minimax: {
        thinking: { type: "disabled" },
      },
    },
    repairText: async ({ text }) => {
      const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      const jsonMatch = withoutThink.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      // Weaker JSON-following sometimes uses near-miss key names
      // (e.g. `compatible`/`reason`) instead of the schema's exact ones.
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const result =
          parsed.result ??
          (typeof parsed.compatible === "boolean"
            ? parsed.compatible
              ? "compatible"
              : "incompatible"
            : undefined);
        const reasoning = parsed.reasoning ?? parsed.reason ?? parsed.explanation;
        const decisive_fields =
          parsed.decisive_fields ?? parsed.fields ?? parsed.decisiveFields ?? [];
        return JSON.stringify({ result, reasoning, decisive_fields });
      } catch {
        return jsonMatch[0];
      }
    },
  });

  return {
    ...object,
    profile_a: a,
    profile_b: b,
    sources: sources(a, b),
  };
}
