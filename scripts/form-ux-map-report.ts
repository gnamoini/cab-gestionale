/**
 * MAP adoption report CLI.
 * Usage: npx tsx scripts/form-ux-map-report.ts [--json] [--metrics]
 */
import {
  buildAdoptionReport,
  computeMapSuccessMetrics,
  formatAdoptionReportText,
} from "@/lib/form-ux-migration/form-ux-adoption-report";

const JSON_OUT = process.argv.includes("--json");
const METRICS = process.argv.includes("--metrics");

const report = buildAdoptionReport();

if (METRICS) {
  const metrics = computeMapSuccessMetrics();
  if (JSON_OUT) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log("MAP Success Metrics");
    console.log("===================");
    console.log(`SSOT adoption: ${metrics.ssotAdoptionPct}%`);
    console.log(`Migration velocity: ${metrics.migrationVelocity} fields/week`);
    console.log(`Rollback rate: ${metrics.rollbackRate}`);
    console.log(`Mismatch rate: ${metrics.mismatchRate}`);
    console.log(`Promotion rate: ${metrics.promotionRate}%/week`);
  }
} else if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatAdoptionReportText(report));
}
