import type { PartProfile } from "./contracts";
import { collectorId, runStudioCollector, scrapePageMarkdown, scrapeMode } from "./brightdata";
import {
  catalogFixtureProfile,
  findCatalogByUrl,
  findCatalogPart,
} from "./catalog";
import { isUsableProfile, normalizePart } from "./normalize";

export type ExtractResult = {
  mode: "fixture" | "live";
  collectorId: string | null;
  profile: PartProfile;
  raw: unknown;
  extraction: "fixture" | "studio" | "markdown";
};

export async function extractDevice(input: {
  catalogId?: string;
  url?: string;
  preferLive?: boolean;
}): Promise<ExtractResult> {
  const catalogPart = input.catalogId
    ? findCatalogPart(input.catalogId)
    : input.url
      ? findCatalogByUrl(input.url)
      : undefined;

  const url = input.url ?? catalogPart?.url;
  if (!url) {
    throw new Error("Provide a catalog id or a product URL.");
  }

  const mode = input.preferLive ? "live" : scrapeMode();
  if (mode === "fixture") {
    if (!catalogPart) {
      throw new Error(
        "Fixture mode only covers catalog URLs. Set COMP_SCRAPE_MODE=live and BRIGHTDATA_COLLECTOR_ID to scrape an arbitrary page.",
      );
    }
    return {
      mode,
      collectorId: collectorId(),
      profile: catalogFixtureProfile(catalogPart),
      raw: catalogPart.fixture,
      extraction: "fixture",
    };
  }

  const { collectorId: id, raw } = await runStudioCollector(url);
  let profile = normalizePart(raw, url);
  let extraction: ExtractResult["extraction"] = "studio";

  if (!isUsableProfile(profile)) {
    const markdown = await scrapePageMarkdown(url);
    profile = normalizePart(
      {
        name: profile.name,
        category: profile.category,
        page_text: markdown,
      },
      url,
    );
    extraction = "markdown";
  }

  if (!isUsableProfile(profile)) {
    throw new Error(
      `No usable specs from ${url}. Studio keys: ${asKeys(raw).join(", ") || "(none)"}.`,
    );
  }

  return {
    mode,
    collectorId: id,
    profile,
    raw,
    extraction,
  };
}

function asKeys(raw: unknown): string[] {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return Object.keys(raw);
  }
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
    return Object.keys(raw[0] as object);
  }
  return [];
}
