/**
 * Audit compat SSOT — score readiness 0–100 e gate advisory pre-release.
 */
import {
  buildCompatReadinessReport,
  COMPAT_READINESS_SCORE_THRESHOLD,
} from "@/lib/magazzino/compat/compat-readiness-report";

function main(): void {
  const report = buildCompatReadinessReport(process.cwd());
  const critical = report.scan.hits.filter((h) => h.severity === "critical");

  console.log("\n=== Compat SSOT Readiness Audit ===\n");
  console.log(`SSOT Coverage: ${report.globalScore}/100`);
  console.log(`Risk Level: ${report.riskLevel}`);
  console.log(`Production readiness: ${report.productionReadiness}`);
  console.log(`Checked at: ${report.checkedAt}`);
  console.log(`Scanned files: ${report.scan.scannedFiles}`);
  console.log(`Scan hits: ${report.scan.hits.length} (critical: ${critical.length})`);

  console.log("\n--- Category scores ---");
  for (const [cat, score] of Object.entries(report.categories)) {
    console.log(`  ${cat}: ${score}/100`);
  }

  if (report.topRisks.length > 0) {
    console.log("\n--- Top risks ---");
    for (const [i, risk] of report.topRisks.entries()) {
      console.log(`\n${i + 1}. [${risk.severity.toUpperCase()}] ${risk.rootCause}`);
      console.log(`   Files: ${risk.files.join(", ") || "—"}`);
      console.log(`   Fix: ${risk.suggestedFix}`);
      console.log(`   Production: ${risk.productionRisk}`);
    }
  }

  if (report.nonConformPages.length > 0) {
    console.log("\n--- Non-conform pages ---");
    for (const p of report.nonConformPages) console.log(`  - ${p}`);
  } else {
    console.log("\n--- Non-conform pages ---\n  (none)");
  }

  console.log("\n--- MUST FIX ---");
  for (const item of report.mustFix.length ? report.mustFix : ["(none)"]) console.log(`  - ${item}`);

  console.log("\n--- SHOULD FIX ---");
  for (const item of report.shouldFix) console.log(`  - ${item}`);

  console.log("\n--- NICE TO HAVE ---");
  for (const item of report.niceToHave) console.log(`  - ${item}`);

  if (report.scan.hits.length > 0) {
    console.log("\n--- Scan detail ---");
    for (const hit of report.scan.hits) {
      console.log(`  ${hit.severity} ${hit.ruleId} ${hit.file}:${hit.line} — ${hit.message}`);
    }
  }

  const failScore = report.globalScore < COMPAT_READINESS_SCORE_THRESHOLD;
  const failCritical = critical.length > 0;

  if (failScore || failCritical) {
    console.error(
      `\ncompat-ssot-audit: FAILED (score=${report.globalScore}, critical=${critical.length}, threshold=${COMPAT_READINESS_SCORE_THRESHOLD})\n`,
    );
    process.exit(1);
  }

  console.log("\ncompat-ssot-audit: PASSED\n");
}

main();
