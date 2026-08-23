import type { PartKind } from "./contracts";
import {
  catalogFixtureProfile,
  counterpartsOf,
  type CatalogPart,
} from "./catalog";
import { extractDevice } from "./extract";
import { compareDevices, type Verdict } from "./match";
import { scrapeMode } from "./brightdata";

export type MatchRow = {
  id: string;
  label: string;
  url: string;
  verdict: Verdict;
};

export type CompatResponse = {
  mode: "fixture" | "live";
  collectorId: string | null;
  query: Awaited<ReturnType<typeof extractDevice>>;
  matches: MatchRow[];
};

function counterpartProfile(part: CatalogPart) {
  return catalogFixtureProfile(part);
}

export async function findCompatibleParts(input: {
  catalogId?: string;
  url?: string;
  kind?: PartKind;
}): Promise<CompatResponse> {
  const query = await extractDevice(input);
  const kind = query.profile.kind;
  const matches: MatchRow[] = counterpartsOf(kind).map((part) => {
    const other = counterpartProfile(part);
    const verdict = compareDevices(query.profile, other);
    return {
      id: part.id,
      label: part.label,
      url: part.url,
      verdict,
    };
  });

  matches.sort((a, b) => rank(a.verdict.result) - rank(b.verdict.result));

  return {
    mode: scrapeMode(),
    collectorId: query.collectorId,
    query,
    matches,
  };
}

function rank(result: Verdict["result"]): number {
  if (result === "compatible") return 0;
  if (result === "unclear") return 1;
  return 2;
}

