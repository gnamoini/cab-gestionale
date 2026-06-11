import {
  classifyAllFields,
  classifyMigrationField,
  classifyMigrationFieldLegacy,
  type MigrationRiskProfile,
} from "@/lib/form-ux-migration/form-ux-migration-classifier";
import {
  scanMigrationInventory,
  type MigrationInventoryField,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import { getWaveExclusionReasons } from "@/lib/form-ux-migration/form-ux-wave-exclusion-rules";
import { mineTierPatterns, type TierPatternStat } from "@/lib/form-ux-migration/form-ux-tier-pattern-miner";

export type FalseNegativeEntry = {
  fieldKey: string;
  nominalTier: number;
  tierBand: string;
  waveEligibleBefore: boolean;
  waveEligibleAfter: boolean;
  exclusionReasons: string[];
  recalibrationReasons: string[];
  patternBucket: string;
};

export type FalseNegativeReport = {
  generatedAt: string;
  tier0StrictBefore: number;
  tier0BandAfter: number;
  falseNegativeCount: number;
  entries: FalseNegativeEntry[];
  patternSummary: Record<string, number>;
  patternStats: TierPatternStat[];
};

function wasLegacyWaveEligible(
  field: MigrationInventoryField,
  legacy: ReturnType<typeof classifyMigrationFieldLegacy>,
): boolean {
  return (
    legacy.tier === 0 &&
    legacy.codemodDisposition === "SAFE_AUTO" &&
    field.status === "legacy" &&
    field.formId != null &&
    !field.fieldId.startsWith("field-")
  );
}

function isRecalibratedWaveEligible(
  field: MigrationInventoryField,
  root: string,
): boolean {
  const decision = resolveFormUxMigrationDecisionForField(field, { root });
  return decision.finalDecision === "INCLUDE";
}

function resolvePatternBucket(
  field: MigrationInventoryField,
  patternStats: TierPatternStat[],
  root: string,
): string {
  const match = patternStats.find((p) => p.exampleFieldKeys.includes(field.fieldKey));
  if (match) return match.pattern;
  const profile = classifyMigrationField(field, { root });
  if (profile.softSignals.length > 0) return profile.softSignals[0]!;
  return "unknown";
}

export function analyzeTier0FalseNegatives(options?: {
  root?: string;
}): FalseNegativeReport {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const profileByKey = new Map(profiles.map((p) => [p.fieldKey, p]));
  const patternStats = mineTierPatterns(fields, { root });

  let tier0StrictBefore = 0;
  let tier0BandAfter = 0;
  const entries: FalseNegativeEntry[] = [];
  const patternSummary: Record<string, number> = {};

  for (const field of fields) {
    const legacy = classifyMigrationFieldLegacy(field, { root });
    const profile = profileByKey.get(field.fieldKey)!;

    if (legacy.tier === 0) tier0StrictBefore += 1;
    if (profile.tierBand === "0" || profile.tierBand === "0B") tier0BandAfter += 1;

    const waveEligibleBefore = wasLegacyWaveEligible(field, legacy);
    const waveEligibleAfter = isRecalibratedWaveEligible(field, root);

    if (!waveEligibleBefore && waveEligibleAfter) {
      const exclusion = getWaveExclusionReasons(field, profile, { root });
      const patternBucket = resolvePatternBucket(field, patternStats, root);
      patternSummary[patternBucket] = (patternSummary[patternBucket] ?? 0) + 1;

      entries.push({
        fieldKey: field.fieldKey,
        nominalTier: profile.tier,
        tierBand: profile.tierBand,
        waveEligibleBefore,
        waveEligibleAfter,
        exclusionReasons: exclusion.reasons,
        recalibrationReasons: profile.recalibrationReasons,
        patternBucket,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tier0StrictBefore,
    tier0BandAfter,
    falseNegativeCount: Math.max(0, tier0BandAfter - tier0StrictBefore),
    entries,
    patternSummary,
    patternStats,
  };
}
