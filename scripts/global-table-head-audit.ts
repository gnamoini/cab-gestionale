/**
 * CLI — GlobalTableHead DOM safety audit.
 */
import {
  auditGlobalTableHeadRepo,
  formatGlobalTableHeadAuditReport,
} from "@/lib/ui/global-table-head-audit";

function main(): void {
  const report = auditGlobalTableHeadRepo();
  console.log(formatGlobalTableHeadAuditReport(report));

  if (report.blockers.length > 0) {
    console.error(`\nglobal-table-head-audit FAIL — ${report.blockers.length} blocker(s)`);
    process.exit(1);
  }

  console.log("\nglobal-table-head-audit OK");
}

main();
