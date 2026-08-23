import { readFileSync } from "node:fs";
import { normalizePart } from "../src/lib/compat/normalize";
import { compareParts } from "../src/lib/compat/match";
import type { PartProfile } from "../src/lib/compat/contracts";

function records(path: string): unknown[] {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? raw : [raw];
}

const files = ["output/live-batch.json"];

const profiles: PartProfile[] = [];
for (const file of files) {
  for (const row of records(file)) {
    const url =
      (row as { source_url?: string; input?: { url?: string } }).source_url ??
      (row as { input?: { url?: string } }).input?.url ??
      "";
    profiles.push(normalizePart(row, url));
  }
}

for (const p of profiles) {
  console.log(`${(p.category ?? "?").padEnd(10)}  ${p.name}  specs=${JSON.stringify(p.specs)}`);
}

console.log("\nmatches");
for (let i = 0; i < profiles.length; i++) {
  for (let j = i + 1; j < profiles.length; j++) {
    const v = await compareParts(profiles[i], profiles[j]);
    console.log(
      `${v.result.padEnd(13)}  ${profiles[i].name}  ×  ${profiles[j].name}  [${v.decisive_fields.join(", ")}]`,
    );
  }
}
