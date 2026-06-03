/**
 * CLI — static route-level UI reliability + flex safety audit.
 */
import {
  auditAllTargetRoutes,
  computeUiReliabilityScores,
  formatRouteReliabilityReport,
  formatUiReliabilityScoreSummary,
} from "@/lib/ui/ui-route-reliability-audit";

function main(): void {
  const reports = auditAllTargetRoutes();
  for (const report of reports) {
    console.log(formatRouteReliabilityReport(report));
    console.log("");
  }

  const scores = computeUiReliabilityScores(reports);
  console.log(formatUiReliabilityScoreSummary(scores));

  const blocked = reports.filter((r) => r.status === "BLOCKED");
  if (blocked.length > 0) {
    console.error(`\nui-flex-route-audit FAIL — ${blocked.length} route(s) BLOCKED (new flex violations)`);
    process.exit(1);
  }

  console.log("\nui-flex-route-audit OK");
}

main();
