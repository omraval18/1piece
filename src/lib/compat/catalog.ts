import type { PartKind } from "./contracts";
import { normalizeDevice } from "./normalize";

export type CatalogPart = {
  id: string;
  kind: PartKind;
  label: string;
  url: string;
  fixture: Record<string, unknown>;
};

/**
 * Public manufacturer / wiki pages. Fixtures are the structured records a
 * Scraper Studio collector is expected to return for each URL.
 */
export const CATALOG: CatalogPart[] = [
  {
    id: "e3d-v6-brass-04",
    kind: "nozzle",
    label: "E3D V6 brass 0.4 mm",
    url: "https://e3d-online.com/products/v6-nozzles",
    fixture: {
      name: "E3D V6 Nozzle 0.4mm Brass",
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
    kind: "nozzle",
    label: "E3D hardened steel (500 °C)",
    url: "https://e3d-online.com/products/hardened-steel-nozzles",
    fixture: {
      name: "E3D Hardened Steel Nozzle",
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
    kind: "nozzle",
    label: "E3D Volcano brass 0.6 mm",
    url: "https://e3d-online.com/products/volcano-nozzles",
    fixture: {
      name: "E3D Volcano Nozzle 0.6mm Brass",
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
    kind: "nozzle",
    label: "Creality MK8 brass 0.4 mm",
    url: "https://www.creality.com/products/creality-brass-nozzle-mk8",
    fixture: {
      name: "Creality MK8 Brass Nozzle 0.4mm",
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
    kind: "hotend",
    label: "E3D V6 all-metal hotend",
    url: "https://e3d-online.com/products/v6-hotend",
    fixture: {
      name: "E3D V6 HotEnd",
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
    kind: "hotend",
    label: "E3D Volcano hotend",
    url: "https://e3d-online.com/products/volcano-hotend",
    fixture: {
      name: "E3D Volcano HotEnd",
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
    kind: "hotend",
    label: "Creality stock PTFE-lined hotend",
    url: "https://reprap.org/wiki/Hot_End_Comparison",
    fixture: {
      name: "Creality stock hotend (PTFE lined)",
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
    kind: "hotend",
    label: "V6-style PTFE-lined hotend (wiki)",
    url: "https://reprap.org/wiki/Hotend",
    fixture: {
      name: "V6-style PTFE-lined hotend",
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
  return CATALOG.map(({ id, kind, label, url }) => ({ id, kind, label, url }));
}

export function findCatalogPart(id: string): CatalogPart | undefined {
  return CATALOG.find((part) => part.id === id);
}

export function findCatalogByUrl(url: string): CatalogPart | undefined {
  const target = url.replace(/\/$/, "");
  return CATALOG.find((part) => part.url.replace(/\/$/, "") === target);
}

export function counterpartsOf(kind: PartKind): CatalogPart[] {
  return CATALOG.filter((part) => part.kind !== kind);
}

export function catalogFixtureProfile(part: CatalogPart) {
  return normalizeDevice(part.fixture, part.kind, part.url);
}
