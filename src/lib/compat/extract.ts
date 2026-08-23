import type { DeviceProfile, PartKind } from "./contracts";
import { collectorId, runStudioCollector, scrapeMode } from "./brightdata";
import {
  catalogFixtureProfile,
  findCatalogByUrl,
  findCatalogPart,
} from "./catalog";
import { inferPartKind, normalizeDevice } from "./normalize";

export type ExtractResult = {
  mode: "fixture" | "live";
  collectorId: string | null;
  profile: DeviceProfile;
  raw: unknown;
};

export async function extractDevice(input: {
  catalogId?: string;
  url?: string;
  kind?: PartKind;
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

  const mode = scrapeMode();
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
    };
  }

  const { collectorId: id, raw } = await runStudioCollector(url);
  const kind = inferPartKind(raw, input.kind ?? catalogPart?.kind);
  if (!kind) {
    throw new Error(
      "Could not tell if this page is a nozzle or a hotend. Pass kind, or check the collector output for part_kind.",
    );
  }
  return {
    mode,
    collectorId: id,
    profile: normalizeDevice(raw, kind, url),
    raw,
  };
}
