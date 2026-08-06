import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = readFileSync(join(root, "lib/ui/viewport-fill-sync.ts"), "utf8");

assert.match(src, /vv != null/);
assert.match(src, /Math\.round\(vv\.height\)/);
assert.doesNotMatch(
  src,
  /Math\.max\([\s\S]*innerHeight[\s\S]*vv/,
  "con visualViewport non usare Math.max con innerHeight",
);
assert.match(src, /cabAppViewportHeightVar/);
assert.match(src, /--cab-vv-height/);
assert.doesNotMatch(src, /\bfixed\b/, "Fase 1: shell non fixed");

console.log("viewport-fill-sync.test.ts OK");
