import "server-only";

import { bdclient } from "@brightdata/sdk";

export type DiscoveredPage = {
  title: string;
  url: string;
  description: string;
  content?: string;
  relevanceScore: number;
};

export type DiscoverResult = {
  query: string;
  candidates: DiscoveredPage[];
  insufficient: boolean;
  reason?: string;
};

// Generic marketplaces/forums/video sites — never an official manufacturer
// or spec-sheet source, regardless of what product is being searched for.
// This is categorically different from a per-brand allowlist: it names no
// manufacturer, so it doesn't narrow which products this works for.
const DEPRIORITIZED_HOSTS = [
  "amazon.",
  "ebay.",
  "walmart.",
  "bestbuy.",
  "aliexpress.",
  "alibaba.",
  "etsy.",
  "target.",
  "newegg.",
  "bhphotovideo.",
  "adorama.",
  "keh.",
  "wish.",
  "temu.",
  "rakuten.",
  "costco.",
  "reddit.",
  "quora.",
  "youtube.",
  "facebook.",
  "instagram.",
  "pinterest.",
];

function registrableDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    return parts.length <= 2 ? host : parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

function isDeprioritized(url: string): boolean {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  return DEPRIORITIZED_HOSTS.some((frag) => host.includes(frag));
}

function evidenceBoost(url: string, title: string): number {
  const hay = `${url} ${title}`.toLowerCase();
  if (/compat|cpu.?support|qvl|motherboard support/.test(hay)) return 0.25;
  if (/spec|datasheet|bios|firmware|manual|support/.test(hay)) return 0.15;
  return 0;
}

/**
 * Search engines often return their own redirect/tracking link instead of
 * the destination (e.g. google.com/goto?url=<opaque-blob>) — scoring or
 * scraping that link operates on the search engine, not the actual page.
 * Resolve it via a real HTTP redirect chain before using it as a candidate.
 */
async function resolveRedirect(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0" },
    });
    return res.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds candidate spec/product pages for any hardware product, on any
 * manufacturer's site — no fixed brand list. Uses Bright Data's own
 * AI-ranked web discovery, then reranks: a domain that recurs across
 * several results (the manufacturer usually has both a product page and a
 * specs subpage indexed) is far more likely to be the official source than
 * a one-off hit, and generic marketplaces/forums are pushed to the bottom.
 * Nothing here names a specific manufacturer, so it works the same for a
 * camera lens, a 3D-printer nozzle, or a phone charger.
 */
export async function discoverSpecPages(input: {
  query: string;
  limit?: number;
}): Promise<DiscoverResult> {
  const query = input.query.trim();
  if (!query) {
    throw new Error("Provide a product query to discover official pages.");
  }

  const client = new bdclient({ autoCreateZones: false, timeout: 120_000 });
  try {
    const result = await client.discover(query, {
      intent:
        "Find official manufacturer pages for this exact product: spec sheets, product pages, compatibility/QVL/CPU-support lists, BIOS or firmware notes, and manuals. Not reviews, retailers, or forum threads.",
      includeContent: true,
      numResults: 10,
      timeout: 120_000,
    });

    const resolved = await Promise.all(
      result.results.map(async (item) => ({
        ...item,
        link: await resolveRedirect(item.link),
      })),
    );

    const domainCounts = new Map<string, number>();
    for (const item of resolved) {
      const domain = registrableDomain(item.link);
      if (domain) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }

    const seen = new Set<string>();
    const candidates: DiscoveredPage[] = resolved
      .filter((item) => {
        const key = item.link.replace(/[?#].*$/, "").replace(/\/$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => {
        const domain = registrableDomain(item.link);
        const recurrence = domain ? (domainCounts.get(domain) ?? 1) - 1 : 0;
        const penalty = isDeprioritized(item.link) ? 1 : 0;
        const adjustedScore =
          item.relevance_score +
          recurrence * 0.15 -
          penalty +
          evidenceBoost(item.link, item.title);
        return {
          title: item.title,
          url: item.link,
          description: item.description,
          content: item.content,
          relevanceScore: adjustedScore,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, Math.min(input.limit ?? 5, 10));

    return {
      query,
      candidates,
      insufficient: candidates.length === 0,
      reason:
        candidates.length === 0
          ? `No public pages found for "${query}".`
          : undefined,
    };
  } finally {
    await client.close();
  }
}
