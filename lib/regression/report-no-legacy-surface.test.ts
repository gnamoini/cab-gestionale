import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPORT_HUB_AREAS } from "@/lib/report/report-hub-areas-config";

const ROOT = process.cwd();

const forbidden = [
  "ReportBiCenterMount",
  "ReportAdvancedAnalysisShell",
  "ReportSectionNav",
  "operational-analytics",
  "ReportModuleOwnerCta",
  "report-analytics-view",
];

const hubPage = readFileSync(join(ROOT, "app/(gestionale)/report/page.tsx"), "utf8");
assert.doesNotMatch(hubPage, /ReportBiCenterMount/);
assert.match(hubPage, /ReportHubView/);

for (const area of REPORT_HUB_AREAS) {
  const pagePath = join(ROOT, "app/(gestionale)/report/(areas)", area.id, "page.tsx");
  const page = readFileSync(pagePath, "utf8");
  for (const token of forbidden) {
    assert.doesNotMatch(page, new RegExp(token), `${area.id} page must not reference ${token}`);
  }
  assert.match(page, /ReportAreaPage/, `${area.id} must use ReportAreaPage`);
}

assert.equal(existsSync(join(ROOT, "components/operational-analytics")), false);

const operationalViews = [
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
  "components/gestionale/dipendenti/dipendenti-view.tsx",
  "components/gestionale/mezzi/mezzi-view.tsx",
];

for (const rel of operationalViews) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  assert.doesNotMatch(src, /operational-analytics/, `${rel} must not mount operational analytics`);
}

assert.equal(existsSync(join(ROOT, "components/report/bi-center/report-bi-center-mount.tsx")), false);
assert.equal(existsSync(join(ROOT, "components/report/report-analytics-view.tsx")), false);

console.log("report-no-legacy-surface.test.ts OK");
