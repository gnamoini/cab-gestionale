/**
 * MAP Tier Calibration CLI — before/after false-negative recovery report.
 *
 * Usage:
 *   npm run form-ux:map:calibrate
 *   npm run form-ux:map:calibrate -- --json
 */
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";
import { analyzeTier0FalseNegatives } from "@/lib/form-ux-migration/form-ux-tier0-false-negative-analyzer";
import { validateRecalibratedCandidates } from "@/lib/form-ux-migration/form-ux-tier-validation-suite";
import {
  classifyAllFields,
  type MigrationRiskProfile,
} from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

const JSON_OUT = process.argv.includes("--json");

function estimateRollbackProbabilityImpact(profiles: MigrationRiskProfile[]): number {
  const tier0Band = profiles.filter((p) => p.tierBand === "0" || p.tierBand === "0B");
  if (tier0Band.length === 0) return 0;
  const softDensity =
    tier0Band.reduce((sum, p) => sum + p.softSignals.length, 0) / tier0Band.length;
  return Math.round(softDensity * 0.08 * 100) / 100;
}

const report = analyzeTier0FalseNegatives();
const { fields } = scanMigrationInventory({});
const profiles = classifyAllFields(fields);
const profileByKey = new Map(profiles.map((p) => [p.fieldKey, p]));

const wavePlan = buildWaveExecutionPlan(1);
const waveCandidates = wavePlan.manifest.candidates.map((c) => ({
  field: fields.find((f) => f.fieldKey === c.fieldKey)!,
  profile: profileByKey.get(c.fieldKey)!,
}));
const validation = validateRecalibratedCandidates(waveCandidates);

const tier0BCandidates = wavePlan.manifest.candidates.filter((c) => c.tierBand === "0B");
const addedRiskExposurePct =
  wavePlan.manifest.candidates.length > 0
    ? Math.round(
        (tier0BCandidates.filter((c) => c.tier0ConfidenceScore < 0.8).length /
          wavePlan.manifest.candidates.length) *
          100,
      )
    : 0;

const tier3Leakage = profiles.filter(
  (p) => p.tierBand === "3" && wavePlan.manifest.candidates.some((c) => c.fieldKey === p.fieldKey),
);

let recommendation: "APPROVE_RECALIBRATION" | "REJECT_RECALIBRATION" = "REJECT_RECALIBRATION";
const recommendationReasons: string[] = [];

if (report.tier0BandAfter === 0) recommendationReasons.push("no_tier0_band_fields");
if (wavePlan.manifest.candidates.length === 0) recommendationReasons.push("wave1_empty");
if (!validation.passed) recommendationReasons.push("validation_not_100pct");
if (tier3Leakage.length > 0) recommendationReasons.push("tier3_leakage");

if (recommendationReasons.length === 0) {
  recommendation = "APPROVE_RECALIBRATION";
  recommendationReasons.push("tier0_recovered", "validation_pass", "wave1_has_candidates");
}

const output = {
  generatedAt: report.generatedAt,
  beforeAfter: {
    tier0StrictBefore: report.tier0StrictBefore,
    tier0BandAfter: report.tier0BandAfter,
    falseNegativesRecovered: report.falseNegativeCount,
  },
  riskDelta: {
    addedRiskExposurePct,
    estimatedRollbackProbabilityImpact: estimateRollbackProbabilityImpact(profiles),
    tier0BCandidateCount: tier0BCandidates.length,
  },
  wave1: {
    candidateCount: wavePlan.manifest.candidates.length,
    eligibleCount: wavePlan.manifest.candidates.filter((c) => c.eligible).length,
    recommendation: wavePlan.recommendation,
    recommendationReasons: wavePlan.recommendationReasons,
  },
  validation: {
    passed: validation.passed,
    violationCount: validation.violations.length,
  },
  recommendation,
  recommendationReasons,
  patternSummary: report.patternSummary,
  falseNegativeSample: report.entries.slice(0, 15),
};

if (JSON_OUT) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("=== MAP Tier Calibration ===");
  console.log("");
  console.log("A. Before / After");
  console.log(`  Tier 0 strict (before): ${output.beforeAfter.tier0StrictBefore}`);
  console.log(`  Tier 0 + 0B (after):    ${output.beforeAfter.tier0BandAfter}`);
  console.log(`  False negatives recovered: ${output.beforeAfter.falseNegativesRecovered}`);
  console.log("");
  console.log("B. Risk delta");
  console.log(`  Added risk exposure: ${output.riskDelta.addedRiskExposurePct}%`);
  console.log(
    `  Rollback probability impact (heuristic): ${output.riskDelta.estimatedRollbackProbabilityImpact}`,
  );
  console.log(`  Tier 0B candidates: ${output.riskDelta.tier0BCandidateCount}`);
  console.log("");
  console.log("C. Wave 1 preview");
  console.log(`  Candidates: ${output.wave1.candidateCount}`);
  console.log(`  Eligible: ${output.wave1.eligibleCount}`);
  console.log(`  Wave recommendation: ${output.wave1.recommendation}`);
  console.log(`  Validation pass: ${output.validation.passed}`);
  console.log("");
  console.log(`D. Recommendation: ${output.recommendation}`);
  console.log(`   Reasons: ${output.recommendationReasons.join(", ")}`);
  console.log("");
  console.log("Re-run wave manifest: npm run form-ux:map:wave:1");
}
