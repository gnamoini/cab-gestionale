import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const perfDir = path.join(ROOT, "docs/perf");
const required = [
  "fatturazione-timeline.explain",
  "fatturazione-open-items.explain",
  "fatturazione-scadenziario.explain",
] as const;

for (const name of required) {
  const p = path.join(perfDir, name);
  assert.ok(fs.existsSync(p), `manca ${name}`);
  const content = fs.readFileSync(p, "utf8");
  assert.match(content, /Index Scan|Bitmap Index Scan|idx_/i, `${name} deve referenziare un indice`);
}

console.log("fatturazione-explain-plans.test.ts OK");
