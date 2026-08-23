import { candidateParts, catalogFixtureProfile, type CatalogPart } from "./catalog";
import { extractDevice } from "./extract";
import { compareParts, type Verdict } from "./match";
import { scrapeMode } from "./brightdata";
import { discoverSpecPages, type DiscoveredPage } from "./discover";
import { isUsableProfile } from "./normalize";

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
}): Promise<CompatResponse> {
  const query = await extractDevice(input);
  const candidates = candidateParts(input.catalogId);
  const matches: MatchRow[] = await Promise.all(
    candidates.map(async (part) => {
      const other = counterpartProfile(part);
      const verdict = await compareParts(query.profile, other);
      return {
        id: part.id,
        label: part.label,
        url: part.url,
        verdict,
      };
    }),
  );

  matches.sort((a, b) => rank(a.verdict.result) - rank(b.verdict.result));

  return {
    mode: scrapeMode(),
    collectorId: query.collectorId,
    query,
    matches,
  };
}

const MAX_CANDIDATES = 5;

export async function compareByUrls(input: {
  deviceUrl: string;
  candidateUrls: string[];
  question?: string;
}) {
  const urls = [...new Set(input.candidateUrls.map((url) => url.trim()))].filter(
    (url) => url && url !== input.deviceUrl,
  );
  if (urls.length === 0) {
    throw new Error("Provide at least one candidate part URL that is not the device URL.");
  }
  if (urls.length > MAX_CANDIDATES) {
    throw new Error(`At most ${MAX_CANDIDATES} candidate URLs per check.`);
  }

  const device = await extractDevice({
    url: input.deviceUrl,
    preferLive: true,
  });

  const matches = [];
  for (const url of urls) {
    const candidate = await extractDevice({ url, preferLive: true });
    const verdict = await compareParts(
      device.profile,
      candidate.profile,
      input.question,
    );
    matches.push({
      url,
      label: candidate.profile.name,
      category: candidate.profile.category,
      profile: candidate.profile,
      result: verdict.result,
      reasoning: verdict.reasoning,
      decisive_fields: verdict.decisive_fields,
    });
  }

  matches.sort((a, b) => rank(a.result) - rank(b.result));

  return {
    mode: device.mode,
    collectorId: device.collectorId,
    device: device.profile,
    matches,
  };
}

function mergeProfiles(
  hits: { page: DiscoveredPage; extracted: Awaited<ReturnType<typeof extractDevice>> }[],
) {
  const first = hits[0]!;
  const texts: string[] = [];
  const specs: Record<string, string | number> = {};
  for (const hit of hits) {
    for (const [key, value] of Object.entries(hit.extracted.profile.specs)) {
      if (key === "page_text") continue;
      if (specs[key] === undefined) specs[key] = value;
    }
    const pageText = hit.extracted.profile.specs.page_text;
    if (typeof pageText === "string" && pageText.trim()) {
      texts.push(`Source: ${hit.page.url}\n${pageText}`);
    }
  }
  if (texts.length) specs.page_text = texts.join("\n\n---\n\n").slice(0, 16_000);
  return {
    page: first.page,
    pages: hits.map((hit) => hit.page),
    extracted: {
      ...first.extracted,
      profile: {
        name: hits.map((h) => h.extracted.profile.name).find(Boolean) ?? null,
        category: hits.map((h) => h.extracted.profile.category).find(Boolean) ?? null,
        source_url: first.extracted.profile.source_url,
        specs,
      },
    },
  };
}

async function gatherEvidence(pages: DiscoveredPage[]) {
  const errors: string[] = [];
  const hits: {
    page: DiscoveredPage;
    extracted: Awaited<ReturnType<typeof extractDevice>>;
  }[] = [];
  for (const page of pages.slice(0, 4)) {
    try {
      const extracted = await extractDevice({
        url: page.url,
        preferLive: true,
      });
      if (!isUsableProfile(extracted.profile)) {
        errors.push(`${page.url}: no usable specs extracted`);
        continue;
      }
      hits.push({ page, extracted });
      if (hits.length >= 2) break;
    } catch (error) {
      errors.push(
        `${page.url}: ${error instanceof Error ? error.message : "scrape failed"}`,
      );
    }
  }
  if (hits.length === 0) {
    return { page: null, pages: [] as DiscoveredPage[], extracted: null, errors };
  }
  return { ...mergeProfiles(hits), errors };
}

export async function compareByQuery(input: {
  deviceQuery: string;
  candidateQuery: string;
  question?: string;
}) {
  const deviceDiscover = await discoverSpecPages({
    query: input.deviceQuery,
    limit: 8,
  });
  const candidateDiscover = await discoverSpecPages({
    query: input.candidateQuery,
    limit: 8,
  });

  if (deviceDiscover.insufficient || candidateDiscover.insufficient) {
    return {
      result: "unclear" as const,
      insufficient_official_evidence: true,
      reasoning:
        deviceDiscover.reason ??
        candidateDiscover.reason ??
        "No public product pages found.",
      device: {
        query: input.deviceQuery,
        discovery: deviceDiscover,
      },
      candidate: {
        query: input.candidateQuery,
        discovery: candidateDiscover,
      },
      matches: [],
    };
  }

  const deviceHit = await gatherEvidence(deviceDiscover.candidates);
  const candidateHit = await gatherEvidence(candidateDiscover.candidates);

  if (!deviceHit.extracted || !candidateHit.extracted) {
    return {
      result: "unclear" as const,
      insufficient_official_evidence: true,
      reasoning:
        "Pages were found, but Scraper Studio did not extract usable specs from them.",
      device: {
        query: input.deviceQuery,
        discovery: deviceDiscover,
        scrape_errors: deviceHit.errors,
      },
      candidate: {
        query: input.candidateQuery,
        discovery: candidateDiscover,
        scrape_errors: candidateHit.errors,
      },
      matches: [],
    };
  }

  const verdict = await compareParts(
    deviceHit.extracted.profile,
    candidateHit.extracted.profile,
    input.question,
  );

  return {
    result: verdict.result,
    insufficient_official_evidence: false,
    reasoning: verdict.reasoning,
    decisive_fields: verdict.decisive_fields,
    sources: verdict.sources,
    device: {
      query: input.deviceQuery,
      page: deviceHit.page,
      pages: deviceHit.pages,
      profile: deviceHit.extracted.profile,
      discovery: {
        candidates: deviceDiscover.candidates,
      },
    },
    candidate: {
      query: input.candidateQuery,
      page: candidateHit.page,
      pages: candidateHit.pages,
      profile: candidateHit.extracted.profile,
      discovery: {
        candidates: candidateDiscover.candidates,
      },
    },
    mode: deviceHit.extracted.mode,
    collectorId: deviceHit.extracted.collectorId,
  };
}

function rank(result: Verdict["result"]): number {
  if (result === "compatible") return 0;
  if (result === "conditional") return 1;
  if (result === "unclear") return 2;
  return 3;
}
