import { CATALOG, catalogFixtureProfile } from "../src/lib/compat/catalog";
import { compareDevices } from "../src/lib/compat/match";

function part(id: string) {
  const found = CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return catalogFixtureProfile(found);
}

function expectResult(
  a: string,
  b: string,
  result: "compatible" | "incompatible" | "unclear",
) {
  const verdict = compareDevices(part(a), part(b));
  if (verdict.result !== result) {
    throw new Error(
      `${a} vs ${b}: expected ${result}, got ${verdict.result} (${verdict.reasoning})`,
    );
  }
}

expectResult("e3d-v6-brass-04", "e3d-v6-hotend", "compatible");
expectResult("e3d-hardened-500", "ptfe-m6-hotend", "incompatible");
expectResult("e3d-volcano-brass", "e3d-v6-hotend", "incompatible");
expectResult("e3d-v6-brass-04", "e3d-volcano-hotend", "incompatible");
expectResult("creality-mk8-brass", "e3d-v6-hotend", "incompatible");
expectResult("creality-mk8-brass", "creality-ptfe-hotend", "compatible");
expectResult("e3d-volcano-brass", "e3d-volcano-hotend", "compatible");

console.log("compat checks passed");
