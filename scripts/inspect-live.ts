import { readFileSync } from "node:fs";
import { inferPartKind, normalizeDevice } from "../src/lib/compat/normalize";
import { compareDevices } from "../src/lib/compat/match";
import type { DeviceProfile } from "../src/lib/compat/contracts";

function records(path: string): unknown[] {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? raw : [raw];
}

const files = [
  "output/live-nozzle.json",
  "output/live-hotend.json",
  "output/live-batch.json",
];

const profiles: DeviceProfile[] = [];
for (const file of files) {
  for (const row of records(file)) {
    const kind = inferPartKind(row);
    if (!kind) {
      console.log("SKIP (no kind)", file, JSON.stringify(row).slice(0, 120));
      continue;
    }
    const url =
      (row as { source_url?: string; input?: { url?: string } }).source_url ??
      (row as { input?: { url?: string } }).input?.url ??
      "";
    profiles.push(normalizeDevice(row, kind, url));
  }
}

for (const p of profiles) {
  console.log(
    `${p.kind.padEnd(6)}  ${p.name}  thread=${p.thread}  fil=${p.filament_diameter_mm}  temp=${p.max_temp_c}` +
      (p.kind === "hotend"
        ? `  throat=${p.throat}  V=${p.heater_voltage}`
        : `  mat=${p.material}  Ø=${p.nozzle_diameter_mm}`),
  );
}

const nozzles = profiles.filter((p) => p.kind === "nozzle");
const hotends = profiles.filter((p) => p.kind === "hotend");
console.log("\nmatches");
for (const n of nozzles) {
  for (const h of hotends) {
    const v = compareDevices(n, h);
    console.log(
      `${v.result.padEnd(13)}  ${n.name}  ×  ${h.name}  [${v.decisive_fields.join(", ")}]`,
    );
  }
}
