import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = [
  "components/gestionale/mezzi",
  "components/gestionale/lavorazioni",
  "lib/mezzi",
];

const FORBIDDEN_PATTERNS = [
  /\bvin\b.*(?:sort|export|search|column|<th\b|thead)/i,
  /(?:sort|export|search).*\bvin\b/i,
  /mezzoMatchesSearch[\s\S]*\bvin\b/,
  /key:\s*["']vin["']/,
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const mezziHelpers = read("lib/mezzi/mezzi-helpers.ts");
assert.doesNotMatch(mezziHelpers, /\bvin\b/i, "VIN vietato in mezzoMatchesSearch");

const mezziView = read("components/gestionale/mezzi/mezzi-view.tsx");
assert.doesNotMatch(mezziView, /["']vin["']/, "VIN vietato in colonne lista mezzi");

const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.doesNotMatch(lavorazioniView, /label:\s*["']VIN["']/, "VIN vietato in colonne lista lavorazioni");

for (const dir of SCAN_DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const ent of fs.readdirSync(full, { recursive: true })) {
    const rel = path.join(dir, String(ent)).replace(/\\/g, "/");
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    if (/\.test\.(ts|tsx)$/.test(rel)) continue;
    if (rel.includes("mezzi-form-fields") || rel.includes("scheda-ingresso")) continue;
    const src = read(rel);
    for (const re of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(src, re, `${rel}: VIN in tabella/search/export`);
    }
  }
}

console.log("vin-table-isolation-audit.test.ts OK");
