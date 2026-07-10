import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walkTsFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

const storage = read("lib/ui/collapsible-prefs/storage.ts");
assert.match(storage, /globalThis\.localStorage\.setItem/);

const shellCard = read("components/gestionale/shell-card.tsx");
assert.match(shellCard, /persistScope/);
assert.match(shellCard, /persistKey/);
assert.match(shellCard, /persist\?: boolean/);

const lavorazioni = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavorazioni, /persistKey="archivio"/);
assert.match(lavorazioni, /persist=\{false\}/);

const offenders: string[] = [];
for (const rel of walkTsFiles(ROOT)) {
  if (rel.includes("lib/ui/collapsible-prefs/")) continue;
  if (rel.includes("lib/ui/collapsible-prefs\\")) continue;
  const src = read(rel);
  if (/localStorage\.setItem\([^)]*collaps/i.test(src)) offenders.push(rel);
  if (/localStorage\.setItem\([^)]*cab-documenti-tree-pref/i.test(src)) offenders.push(rel);
  if (/sessionStorage\.setItem\([^)]*kanban/i.test(src)) offenders.push(rel);
  if (/sessionStorage\.setItem\([^)]*open-section/i.test(src)) offenders.push(rel);
}

assert.equal(
  offenders.length,
  0,
  `collapse prefs must use storage.ts only; found: ${[...new Set(offenders)].join(", ")}`,
);

console.log("collapsible-prefs-audit.test.ts OK");
