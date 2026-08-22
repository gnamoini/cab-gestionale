import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const BI = join(ROOT, "components/report/bi-center");

const FORBIDDEN = ["buildInvoicePeriodKpiExtended", "countCompletedInRange", "from(\"invoices\")", "supabase"];

for (const rel of [
  "report-domain-sections.tsx",
  "report-clienti-section.tsx",
  "report-primary-trend-section.tsx",
  "report-metric-envelope-card.tsx",
  "report-drill-down-provider.tsx",
  "drill-down/report-drill-down-panel.tsx",
  "drill-down/use-report-drilldown-query.ts",
]) {
  const src = readFileSync(join(BI, rel), "utf8");
  for (const sym of FORBIDDEN) {
    assert.ok(!src.includes(sym), `${rel} must not contain ${sym}`);
  }
}

console.log("report-p2-ui-no-formulas.test.ts OK");
