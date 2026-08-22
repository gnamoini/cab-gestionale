import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const BI = join(ROOT, "components/report/bi-center");
const OP = join(BI, "operational");

const FORBIDDEN = ["buildInvoicePeriodKpiExtended", "countCompletedInRange", 'from("invoices")', "supabase"];

for (const rel of [
  "report-domain-sections.tsx",
  "report-clienti-section.tsx",
  "report-primary-trend-section.tsx",
  "report-metric-envelope-card.tsx",
  "report-drill-down-provider.tsx",
  "drill-down/report-drill-down-panel.tsx",
  "drill-down/use-report-drilldown-query.ts",
  "operational/report-operational-context-panel.tsx",
  "operational/report-timeline-v2.tsx",
  "operational/report-timeline-event-card.tsx",
  "operational/report-diary-event-card.tsx",
]) {
  const base = rel.startsWith("operational/") ? BI : BI;
  const src = readFileSync(join(base, rel), "utf8");
  for (const sym of FORBIDDEN) {
    assert.ok(!src.includes(sym), `${rel} must not contain ${sym}`);
  }
}

console.log("report-p5-ui-no-formulas.test.ts OK");
