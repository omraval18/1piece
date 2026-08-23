import { normalizePart, isUsableProfile } from "../src/lib/compat/normalize";
import liveNozzle from "../output/live-nozzle.json";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const fromLive = normalizePart(liveNozzle[0], "https://e3d-online.com/products/e3d-v6-brass-nozzles");
assert(fromLive.name, "live nozzle should keep a name");
assert(isUsableProfile(fromLive), "live nozzle should be usable");

const emptyStudio = normalizePart(
  { name: null, category: null, part_kind: null, thread: null, input: { url: "https://www.amd.com/9950x" } },
  "https://www.amd.com/9950x",
);
assert(emptyStudio.name === null, `empty studio should have no name, got ${emptyStudio.name}`);
assert(
  !isUsableProfile(emptyStudio),
  `empty studio must not count as specs, got keys: ${Object.keys(emptyStudio.specs).join(",")}`,
);

const nested = normalizePart(
  { product: { name: "Ryzen 9 9950X", socket: "AM5", tdp_w: 170 } },
  "https://www.amd.com/9950x",
);
assert(nested.name === "Ryzen 9 9950X", `nested unwrap name, got ${nested.name}`);
assert(nested.specs.socket === "AM5", `nested socket, got ${JSON.stringify(nested.specs)}`);
assert(isUsableProfile(nested), "nested product should be usable");

const fromText = normalizePart(
  { page_text: "x".repeat(500), name: "Ryzen 9 9950X" },
  "https://www.amd.com/9950x",
);
assert(isUsableProfile(fromText), "long page_text should be usable");

console.log("debug-normalize: all assertions passed");
