/**
 * Flex freeze manifest — snapshot counts + baseline checksum for CI immutability.
 * Bump governanceVersion when allowlist or baseline policy intentionally changes.
 * Used only by approved update script — CI reads committed file, never derives output.
 */
import {
  FLEX_CONTAINMENT_MARKERS,
  FLEX_OVERFLOW_CLASS_TOKENS,
  FLEX_OVERFLOW_FILE_ALLOWLIST,
  FLEX_SHRINK_MARKERS,
} from "@/lib/ui/global-flex-system";
import type { FlexBaselineFile } from "@/lib/lint/flex-baseline-fingerprint";
import { FLEX_SYSTEM_GOVERNANCE_MODE } from "@/lib/ui/flex-system-freeze";

export type FlexFreezeManifest = {
  governanceVersion: number;
  /** @deprecated Use governanceVersion */
  freezeVersion: number;
  freezeMode: boolean;
  baselineChecksum: string;
  allowlistTokenCount: number;
  allowlistFilePatternCount: number;
  shrinkMarkerCount: number;
  containmentMarkerCount: number;
  baselineEntryCount: number;
};

export function buildFlexFreezeManifest(baseline: FlexBaselineFile): FlexFreezeManifest {
  return {
    governanceVersion: 1,
    freezeVersion: 1,
    freezeMode: FLEX_SYSTEM_GOVERNANCE_MODE,
    baselineChecksum: baseline.checksum,
    allowlistTokenCount: FLEX_OVERFLOW_CLASS_TOKENS.length,
    allowlistFilePatternCount: FLEX_OVERFLOW_FILE_ALLOWLIST.length,
    shrinkMarkerCount: FLEX_SHRINK_MARKERS.length,
    containmentMarkerCount: FLEX_CONTAINMENT_MARKERS.length,
    baselineEntryCount: baseline.entryCount,
  };
}

export function verifyFlexFreezeManifest(
  manifest: FlexFreezeManifest,
  baseline: FlexBaselineFile,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const expected = buildFlexFreezeManifest(baseline);

  if (manifest.freezeMode !== expected.freezeMode) {
    errors.push("freezeMode mismatch");
  }
  if (manifest.baselineChecksum !== baseline.checksum) {
    errors.push(
      `baselineChecksum mismatch: manifest ${manifest.baselineChecksum}, baseline ${baseline.checksum}`,
    );
  }
  if (manifest.allowlistTokenCount !== expected.allowlistTokenCount) {
    errors.push(
      `allowlistTokenCount changed: ${manifest.allowlistTokenCount} → ${expected.allowlistTokenCount} (bump flex-freeze-manifest.json)`,
    );
  }
  if (manifest.allowlistFilePatternCount !== expected.allowlistFilePatternCount) {
    errors.push(
      `allowlistFilePatternCount changed: ${manifest.allowlistFilePatternCount} → ${expected.allowlistFilePatternCount}`,
    );
  }
  if (manifest.shrinkMarkerCount !== expected.shrinkMarkerCount) {
    errors.push(`shrinkMarkerCount changed`);
  }
  if (manifest.containmentMarkerCount !== expected.containmentMarkerCount) {
    errors.push(`containmentMarkerCount changed`);
  }
  if (manifest.baselineEntryCount !== baseline.entryCount) {
    errors.push(
      `baselineEntryCount mismatch: manifest ${manifest.baselineEntryCount}, baseline ${baseline.entryCount}`,
    );
  }

  const govVersion = manifest.governanceVersion ?? manifest.freezeVersion;
  if (govVersion < 1) {
    errors.push("governanceVersion must be >= 1");
  }

  return { valid: errors.length === 0, errors };
}
