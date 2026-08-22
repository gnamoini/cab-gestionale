import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const DC = join(ROOT, "components/report/decision-center");

const FORBIDDEN = ["buildInvoicePeriodKpiExtended", 'from("invoices")', "supabase"];

for (const rel of [
  "report-decision-center.tsx",
  "report-decision-card.tsx",
  "report-decision-evidence.tsx",
  "use-decision-center-query.ts",
]) {
  const src = readFileSync(join(DC, rel), "utf8");
  for (const sym of FORBIDDEN) {
    if (src.includes(sym)) throw new Error(`${rel} must not contain ${sym}`);
  }
}

console.log("report-p7-ui-no-formulas.test.ts OK");
