import { normalizePart } from "./normalize";

export type CatalogPart = {
  id: string;
  label: string;
  url: string;
  fixture: Record<string, unknown>;
};

/**
 * Public manufacturer / wiki pages. Fixtures are the structured records a
 * Scraper Studio collector is expected to return for each URL.
 *
 * These happen to all be 3D-printer nozzle/hotend parts because that's the
 * real, verifiable data this demo ships with — nothing in the pipeline
 * requires that category. Any other kind of part works the same way once a
 * collector has scraped a real page for it.
 */
export const CATALOG: CatalogPart[] = [
  {
    id: "e3d-v6-brass-04",
    label: "E3D V6 brass nozzle, 0.4 mm",
    url: "https://e3d-online.com/products/v6-nozzles",
    fixture: {
      name: "E3D V6 Nozzle 0.4mm Brass",
      category: "nozzle",
      thread: "M6x1",
      body: "standard",
      thread_length_mm: 7.5,
      nozzle_diameter_mm: 0.4,
      max_temp_c: 300,
      material: "brass",
      filament_diameter_mm: 1.75,
      source_url: "https://e3d-online.com/products/v6-nozzles",
    },
  },
  {
    id: "e3d-hardened-500",
    label: "E3D hardened steel nozzle (500 °C)",
    url: "https://e3d-online.com/products/hardened-steel-nozzles",
    fixture: {
      name: "E3D Hardened Steel Nozzle",
      category: "nozzle",
      thread: "M6x1",
      body: "standard",
      nozzle_diameter_mm: 0.4,
      max_temp_c: 500,
      material: "hardened_steel",
      filament_diameter_mm: 1.75,
      source_url: "https://e3d-online.com/products/hardened-steel-nozzles",
    },
  },
  {
    id: "e3d-volcano-brass",
    label: "E3D Volcano brass nozzle, 0.6 mm",
    url: "https://e3d-online.com/products/volcano-nozzles",
    fixture: {
      name: "E3D Volcano Nozzle 0.6mm Brass",
      category: "nozzle",
      thread: "M6x1",
      body: "volcano",
      nozzle_diameter_mm: 0.6,
      max_temp_c: 300,
      material: "brass",
      filament_diameter_mm: 1.75,
      source_url: "https://e3d-online.com/products/volcano-nozzles",
    },
  },
  {
    id: "creality-mk8-brass",
    label: "Creality MK8 brass nozzle, 0.4 mm",
    url: "https://www.creality.com/products/creality-brass-nozzle-mk8",
    fixture: {
      name: "Creality MK8 Brass Nozzle 0.4mm",
      category: "nozzle",
      thread: "MK8",
      body: "standard",
      nozzle_diameter_mm: 0.4,
      max_temp_c: 260,
      material: "brass",
      filament_diameter_mm: 1.75,
      source_url: "https://www.creality.com/products/creality-brass-nozzle-mk8",
    },
  },
  {
    id: "e3d-v6-hotend",
    label: "E3D V6 all-metal hotend",
    url: "https://e3d-online.com/products/v6-hotend",
    fixture: {
      name: "E3D V6 HotEnd",
      category: "hotend",
      thread: "M6x1",
      body: "standard",
      throat: "all_metal",
      max_temp_c: 300,
      heater_voltage: "24V",
      heater_cartridge_mm: "6x20",
      thermistor_type: "NTC100K",
      filament_diameter_mm: 1.75,
      source_url: "https://e3d-online.com/products/v6-hotend",
    },
  },
  {
    id: "e3d-volcano-hotend",
    label: "E3D Volcano hotend",
    url: "https://e3d-online.com/products/volcano-hotend",
    fixture: {
      name: "E3D Volcano HotEnd",
      category: "hotend",
      thread: "M6x1",
      body: "volcano",
      throat: "all_metal",
      max_temp_c: 300,
      heater_voltage: "24V",
      filament_diameter_mm: 1.75,
      source_url: "https://e3d-online.com/products/volcano-hotend",
    },
  },
  {
    id: "creality-ptfe-hotend",
    label: "Creality stock PTFE-lined hotend",
    url: "https://reprap.org/wiki/Hot_End_Comparison",
    fixture: {
      name: "Creality stock hotend (PTFE lined)",
      category: "hotend",
      thread: "MK8",
      body: "standard",
      throat: "ptfe_lined",
      max_temp_c: 250,
      heater_voltage: "24V",
      filament_diameter_mm: 1.75,
      source_url: "https://reprap.org/wiki/Hot_End_Comparison",
    },
  },
  {
    id: "ptfe-m6-hotend",
    label: "V6-style PTFE-lined hotend (wiki)",
    url: "https://reprap.org/wiki/Hotend",
    fixture: {
      name: "V6-style PTFE-lined hotend",
      category: "hotend",
      thread: "M6x1",
      body: "standard",
      throat: "ptfe_lined",
      max_temp_c: 245,
      filament_diameter_mm: 1.75,
      source_url: "https://reprap.org/wiki/Hotend",
    },
  },
];

export function listCatalog() {
  return CATALOG.map(({ id, label, url }) => ({ id, label, url }));
}

export function findCatalogPart(id: string): CatalogPart | undefined {
  return CATALOG.find((part) => part.id === id);
}

export function findCatalogByUrl(url: string): CatalogPart | undefined {
  const target = url.replace(/\/$/, "");
  return CATALOG.find((part) => part.url.replace(/\/$/, "") === target);
}

/** All catalog parts except `excludeId` (the query itself, when it's a catalog part). */
export function candidateParts(excludeId?: string): CatalogPart[] {
  return CATALOG.filter((part) => part.id !== excludeId);
}

export function catalogFixtureProfile(part: CatalogPart) {
  return normalizePart(part.fixture, part.url);
}
