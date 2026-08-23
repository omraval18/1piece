import "server-only";

import { bdclient } from "@brightdata/sdk";

export function scrapeMode(): "fixture" | "live" {
  return process.env.COMP_SCRAPE_MODE === "live" ? "live" : "fixture";
}

export function collectorId(): string | null {
  const id = process.env.BRIGHTDATA_COLLECTOR_ID?.trim();
  return id || null;
}

function firstRecord(data: unknown[] | null): unknown {
  if (!data || data.length === 0) return null;
  const row = data[0];
  if (Array.isArray(row)) return row[0] ?? null;
  return row;
}

export async function runStudioCollector(
  url: string,
): Promise<{ collectorId: string; raw: unknown }> {
  const id = collectorId();
  if (!id) {
    throw new Error(
      "No Scraper Studio collector. Set BRIGHTDATA_COLLECTOR_ID to the product-specs c_* id.",
    );
  }

  const client = new bdclient({
    autoCreateZones: false,
    timeout: 180_000,
  });

  try {
    const results = await client.scraperStudio.run(id, {
      input: { url },
      timeout: 180_000,
      pollInterval: 5_000,
    });
    const first = results[0];
    if (!first) {
      throw new Error("Scraper Studio returned no results");
    }
    if (first.error) {
      throw new Error(`Scraper Studio error: ${first.error}`);
    }
    const raw = firstRecord(first.data);
    if (raw == null) {
      throw new Error("Collector returned an empty profile for this URL");
    }
    return { collectorId: id, raw };
  } finally {
    await client.close();
  }
}
