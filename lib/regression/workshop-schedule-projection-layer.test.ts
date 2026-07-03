import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = path.join(ROOT, dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(path.join(dir, ent.name)));
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(fs.readFileSync(p, "utf8"));
  }
  return out;
}

const files = walk("components/workshop-schedule");
for (const src of files) {
  assert.doesNotMatch(src, /from ["']@\/src\/services\/lavorazioni\.service/);
  assert.doesNotMatch(src, /lavorazioniDomainQueryKeys/);
}

const service = fs.readFileSync(path.join(ROOT, "src/services/workshop-schedule.service.ts"), "utf8");
assert.match(service, /enrichedView/);

console.log("workshop-schedule-projection-layer.test.ts OK");
