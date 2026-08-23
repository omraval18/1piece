import "dotenv/config";
import { CATALOG, catalogFixtureProfile } from "../src/lib/compat/catalog";
import { compareParts, type CompatResult } from "../src/lib/compat/match";

function part(id: string) {
  const found = CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return catalogFixtureProfile(found);
}

const VALID_RESULTS: CompatResult[] = [
  "compatible",
  "incompatible",
  "conditional",
  "unclear",
];

async function main() {
  if (!process.env.MINIMAX_API_KEY) {
    // No live model call available — this only checks the deterministic
    // no-key fallback in compareParts, not actual compatibility judgment.
    // Set MINIMAX_API_KEY to exercise the real path.
    const verdict = await compareParts(part("e3d-v6-brass-04"), part("e3d-v6-hotend"));
    if (verdict.result !== "unclear" || !verdict.reasoning.includes("MINIMAX_API_KEY")) {
      throw new Error(
        `expected the no-key fallback to report unclear/MINIMAX_API_KEY, got: ${verdict.result} — ${verdict.reasoning}`,
      );
    }
    console.log("compat fallback check passed (no MINIMAX_API_KEY set, fixture mode only)");
    return;
  }

  const pairs: [string, string][] = [
    ["e3d-v6-brass-04", "e3d-v6-hotend"],
    ["e3d-hardened-500", "ptfe-m6-hotend"],
    ["e3d-volcano-brass", "e3d-v6-hotend"],
  ];

  for (const [a, b] of pairs) {
    const verdict = await compareParts(part(a), part(b));
    if (!VALID_RESULTS.includes(verdict.result)) {
      throw new Error(`${a} vs ${b}: got an invalid result ${verdict.result}`);
    }
    console.log(`${verdict.result.padEnd(13)}  ${a}  ×  ${b}  [${verdict.decisive_fields.join(", ")}]`);
  }
  console.log("compat checks passed (live model calls — judgment, not asserted exact outcomes)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
