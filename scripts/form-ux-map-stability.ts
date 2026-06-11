/**
 * MAP Tier Stability CLI — drift report, snapshots, lock export.
 *
 * Usage:
 *   npm run form-ux:map:stability
 *   npm run form-ux:map:stability -- --json
 *   npm run form-ux:map:stability -- --snapshot
 *   npm run form-ux:map:stability -- --export-locks
 */
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { writeClassifierSnapshot } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { exportApprovedLocks } from "@/lib/form-ux-migration/form-ux-tier-lock-registry";
import { buildTierStabilityReport } from "@/lib/form-ux-migration/form-ux-tier-stability-report";
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";

const JSON_OUT = process.argv.includes("--json");
const WRITE_SNAPSHOT = process.argv.includes("--snapshot");
const EXPORT_LOCKS = process.argv.includes("--export-locks");

const root = process.cwd();
const report = buildTierStabilityReport({ root });

let snapshotPath: string | undefined;
if (WRITE_SNAPSHOT) {
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  snapshotPath = writeClassifierSnapshot(profiles, { root });
}

let exportedLocks: ReturnType<typeof exportApprovedLocks> | undefined;
if (EXPORT_LOCKS) {
  exportedLocks = exportApprovedLocks({ root });
}

const wavePlan = buildWaveExecutionPlan(1, { root });

const output = {
  report,
  snapshotPath,
  exportedLockCount: exportedLocks?.locks.length,
  wave: {
    candidates: wavePlan.manifest.totalFields,
    driftAdjusted: wavePlan.driftAdjustedCandidates.length,
    recommendation: wavePlan.recommendation,
  },
};

if (JSON_OUT) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("=== MAP Tier Stability Report ===");
  console.log("");
  console.log("A. Stability impact");
  console.log(`  Tier 0B total (incl. downgraded): ${report.tier0bTotal}`);
  console.log(`  Tier 0B stable:   ${report.tier0bStable}`);
  console.log(`  Tier 0B unstable: ${report.tier0bUnstable}`);
  console.log(`  Eligibility excluded (classification 0B): ${report.tier0bEligibilityExcluded}`);
  console.log(
    `  Wave impact: ${report.waveImpact.candidatesBeforeStabilization} → ${report.waveImpact.candidatesAfterStabilization} (delta ${report.waveImpact.delta})`,
  );
  console.log(`  Drift-adjusted exclusions: ${wavePlan.driftAdjustedCandidates.length}`);
  console.log("");
  console.log("B. Drift risk assessment");
  console.log(`  Level: ${report.driftRiskLevel}`);
  console.log(`  Notes: ${report.driftRiskExplanation.join(", ")}`);
  console.log("");
  console.log("C. Recommendation");
  console.log(`  ${report.recommendation}`);
  console.log(`  Reasons: ${report.recommendationReasons.join(", ")}`);
  if (snapshotPath) {
    console.log("");
    console.log(`Snapshot written: ${snapshotPath}`);
  }
  if (exportedLocks) {
    console.log(`Approved locks exported: ${exportedLocks.locks.length} entries`);
  }
  console.log("");
  console.log("Re-run wave manifest: npm run form-ux:map:wave:1");
}
