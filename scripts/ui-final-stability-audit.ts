/**
 * CLI — UI Final Stability Audit + score governance report.
 */
import {
  auditAllUiFinalStability,
  computeGlobalUiFinalHealth,
  formatUiFinalIssueBreakdown,
  formatUiFinalStabilityTable,
  formatUiFinalSystemHealth,
} from "@/lib/ui/ui-final-stability-audit";

function main(): void {
  const reports = auditAllUiFinalStability();
  const health = computeGlobalUiFinalHealth(reports);

  console.log(formatUiFinalStabilityTable(reports));
  console.log("");

  for (const report of reports) {
    const breakdown = formatUiFinalIssueBreakdown(report);
    if (breakdown) {
      console.log(breakdown);
      console.log("");
    }
  }

  console.log(formatUiFinalSystemHealth(health));

  if (health.recommendation === "AT RISK") {
    console.error("\nui-final-stability-audit FAIL — system AT RISK (new flex violations detected)");
    process.exit(1);
  }

  console.log("\nui-final-stability-audit OK");
}

main();
