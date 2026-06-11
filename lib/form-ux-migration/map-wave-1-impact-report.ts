import {
  scanMigrationInventory,
  summarizeInventoryCoverage,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import type { WaveManifest } from "@/lib/form-ux-migration/form-ux-wave-executor";

export type WaveImpactReport = {
  wave: number;
  currentCoveragePct: number;
  projectedCoveragePct: number;
  deltaPct: number;
  currentSsotFields: number;
  projectedSsotFields: number;
  candidateCount: number;
  eligibleCandidateCount: number;
};

export function buildWaveImpactReport(
  manifest: WaveManifest,
  options?: { root?: string },
): WaveImpactReport {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const current = summarizeInventoryCoverage(fields);

  const eligibleKeys = new Set(
    manifest.candidates.filter((c) => c.eligible).map((c) => c.fieldKey),
  );

  const projectedFields = fields.map((field) => {
    if (!eligibleKeys.has(field.fieldKey) || field.status !== "legacy") {
      return field;
    }
    return { ...field, status: "shadow" as const };
  });

  const projected = summarizeInventoryCoverage(projectedFields);
  const currentCoveragePct = current.coveragePct;
  const projectedCoveragePct = projected.coveragePct;

  return {
    wave: manifest.wave,
    currentCoveragePct,
    projectedCoveragePct,
    deltaPct: projectedCoveragePct - currentCoveragePct,
    currentSsotFields: current.ssot + current.hybrid,
    projectedSsotFields: projected.ssot + projected.hybrid,
    candidateCount: manifest.candidates.length,
    eligibleCandidateCount: manifest.candidates.filter((c) => c.eligible).length,
  };
}

/** @deprecated Use buildWaveImpactReport */
export function buildWave1ImpactReport(
  manifest: WaveManifest,
  options?: { root?: string },
): WaveImpactReport {
  return buildWaveImpactReport(manifest, options);
}
