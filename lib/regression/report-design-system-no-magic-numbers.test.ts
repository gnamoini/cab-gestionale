import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");
const FORBIDDEN = [/formatCurrency/i, /formatEuro/i, /formatMoney/i];

for (const file of fs.readdirSync(SECTIONS_DIR)) {
  if (!file.endsWith(".tsx")) continue;
  const content = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
  for (const pattern of FORBIDDEN) {
    assert.doesNotMatch(content, pattern, `${file}: formatter ad hoc vietato`);
  }
}

const PRIMITIVES_DIR = path.join(ROOT, "components/report/design-system/primitives");
function scanMagicNumbers(dir: string): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) scanMagicNumbers(full);
    else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) {
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      const content = fs.readFileSync(full, "utf8");
      if (rel.includes("chart/") && /const\s+H\s*=\s*\d+/.test(content)) {
        assert.fail(`${rel}: magic chart height — usare visual-density`);
      }
      if (/const\s+(cardPadding|chartHeight)\s*=\s*\d+/.test(content)) {
        assert.fail(`${rel}: magic visual constant`);
      }
    }
  }
}
scanMagicNumbers(PRIMITIVES_DIR);

console.log("report-design-system-no-magic-numbers.test.ts OK");
