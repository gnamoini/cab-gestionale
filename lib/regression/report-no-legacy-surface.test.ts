import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const analyticsView = readFileSync(join(ROOT, "components/report/report-analytics-view.tsx"), "utf8");
const biMount = readFileSync(join(ROOT, "components/report/bi-center/report-bi-center-mount.tsx"), "utf8");

const forbidden = [
  "LegacyBlockedAccordion",
  "legacy-blocked",
  "ReportSectionsWithContext",
  "ReportSections",
  "Analisi legacy",
  "legacy-blocked-accordion",
];

for (const token of forbidden) {
  assert.doesNotMatch(analyticsView, new RegExp(token), `/report analytics must not reference ${token}`);
  assert.doesNotMatch(biMount, new RegExp(token), `BI mount must not reference ${token}`);
}

assert.doesNotMatch(analyticsView, /legacySections/);
assert.match(biMount, /report-bi-center/);
assert.equal(existsSync(join(ROOT, "components/report/layout/report-sections.tsx")), false);
assert.equal(existsSync(join(ROOT, "components/report/legacy-blocked/legacy-blocked-accordion.tsx")), false);

const modulePanels = [
  "components/operational-analytics/lavorazioni-operational-panel.tsx",
  "components/operational-analytics/magazzino-operational-panel.tsx",
  "components/operational-analytics/mezzi-operational-panel.tsx",
  "components/operational-analytics/dipendenti-operational-panel.tsx",
];

for (const rel of modulePanels) {
  assert.ok(existsSync(join(ROOT, rel)), `owner surface missing: ${rel}`);
}

console.log("report-no-legacy-surface.test.ts OK");
