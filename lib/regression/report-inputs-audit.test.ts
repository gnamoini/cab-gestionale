/**
 * Audit report: pattern input portal, a11y filtri/modali, no controlli nativi OS.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function readDirRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...readDirRecursive(full));
    else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) out.push(fs.readFileSync(full, "utf8"));
  }
  return out;
}

const reportSources = readDirRecursive(path.join(ROOT, "components/report")).join("\n");

assert.doesNotMatch(reportSources, /type="date"/);
assert.doesNotMatch(reportSources, /<select\b/);
assert.doesNotMatch(reportSources, /<datalist\b/);

const controls = read("components/report/report-controls.tsx");
const temporal = read("components/report/report-lavorazioni-temporal-section.tsx");
const lavorazioni = read("components/report/report-lavorazioni-section.tsx");
const magazzino = read("components/report/report-magazzino-section.tsx");
const ricambi = read("components/report/report-ricambi-consumo-section.tsx");

assert.match(controls, /aria-pressed=\{preset === id\}/);
assert.match(controls, /id="report-compare-da"/);
assert.match(controls, /id="report-period-a"/);
assert.match(controls, /Periodo analisi/);
assert.match(controls, /Periodo confronto/);
assert.match(controls, /GlobalDatePickerYmd/);
assert.match(controls, /GlobalSelect/);
assert.match(controls, /reportPeriodPresetSelectItemsForOverflow/);
assert.match(controls, /reportQuickPresetChipLabel/);
assert.match(controls, /REPORT_COMPARE_QUICK_IDS/);

assert.match(temporal, /htmlFor=\{yearSelectId\}/);
assert.match(temporal, /GlobalSelect/);

assert.match(ricambi, /aria-pressed=\{vista === id\}/);
assert.match(ricambi, /htmlFor="report-ricambi-mese"/);
assert.match(ricambi, /htmlFor="report-ricambi-anno"/);

assert.match(lavorazioni, /GestionaleModalScrollBody/);
assert.match(lavorazioni, /htmlFor="report-manual-period"/);
assert.match(lavorazioni, /id="report-manual-count"/);
assert.match(lavorazioni, /inputMode="numeric"/);
assert.match(lavorazioni, /role="alert"/);

assert.match(magazzino, /GestionaleModalScrollBody/);
assert.match(magazzino, /htmlFor="report-mag-manual-mese"/);
assert.match(magazzino, /inputMode="decimal"/);

console.log("report-inputs-audit.test.ts OK");
