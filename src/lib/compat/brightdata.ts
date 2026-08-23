import "server-only";

import { bdclient } from "@brightdata/sdk";

export function scrapeMode(): "fixture" | "live" {
  return process.env.COMP_SCRAPE_MODE === "live" ? "live" : "fixture";
}

export function collectorId(): string | null {
  const id = process.env.BRIGHTDATA_COLLECTOR_ID?.trim();
  return id || null;
}

function flattenRecords(data: unknown[] | null): unknown[] {
  if (!data || data.length === 0) return [];
  const out: unknown[] = [];
  for (const row of data) {
    if (Array.isArray(row)) out.push(...row);
    else if (row != null) out.push(row);
  }
  return out;
}

function firstRecord(data: unknown[] | null): unknown {
  return flattenRecords(data)[0] ?? null;
}

async function runCollector(
  url: string,
  id: string,
): Promise<{ collectorId: string; records: unknown[] }> {
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
    return { collectorId: id, records: flattenRecords(first.data) };
  } finally {
    await client.close();
  }
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
  const { collectorId: used, records } = await runCollector(url, id);
  const raw = records[0] ?? null;
  if (raw == null) {
    throw new Error("Collector returned an empty profile for this URL");
  }
  return { collectorId: used, raw };
}

export async function scrapePageMarkdown(url: string): Promise<string> {
  const client = new bdclient({
    autoCreateZones: false,
    timeout: 90_000,
  });
  try {
    const body = await client.scrapeUrl(url, {
      dataFormat: "markdown",
      timeout: 90_000,
    });
    const text = typeof body === "string" ? body.trim() : JSON.stringify(body);
    if (!text) {
      throw new Error("Web Unlocker returned empty markdown for this URL");
    }
    return text.slice(0, 20_000);
  } finally {
    await client.close();
  }
}
