import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const BI = join(ROOT, "components/report/bi-center");
const ADV = join(BI, "advanced");

const FORBIDDEN = ["buildInvoicePeriodKpiExtended", "countCompletedInRange", 'from("invoices")', "supabase"];
const INTERPRETIVE = [/cresciut.*più rapidamente/i, /causato/i, /interpretationLine/i];

for (const rel of [
  "report-domain-sections.tsx",
  "report-primary-trend-section.tsx",
  "report-advanced-analysis-shell.tsx",
  "report-bi-center-mount.tsx",
  "advanced/report-cross-domain-section.tsx",
  "advanced/report-multi-metric-chart.tsx",
  "advanced/report-section-nav.tsx",
  "advanced/report-trust-compare-footer.tsx",
  "operational/report-operational-context-panel.tsx",
]) {
  const src = readFileSync(join(BI, rel), "utf8");
  for (const sym of FORBIDDEN) {
    assert.ok(!src.includes(sym), `${rel} must not contain ${sym}`);
  }
}

for (const rel of ["report-cross-domain-section.tsx"]) {
  const src = readFileSync(join(ADV, rel), "utf8");
  for (const re of INTERPRETIVE) {
    assert.ok(!re.test(src), `${rel} must not contain interpretive prose builders`);
  }
}

console.log("report-p6-ui-no-formulas.test.ts OK");
