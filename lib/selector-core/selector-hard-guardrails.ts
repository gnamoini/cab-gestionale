/**
 * @advisory v5.2 — hard guardrails for snapshot-based config governance.
 */
import type {
  EffectiveConfigBuildResult,
  PromotionRegistryState,
  SelectorConfigProposal,
  SelectorConfigMergeSlice,
  SelectorRuntimeSnapshot,
  SelectorSnapshotManifest,
} from "@/lib/selector-core/types";

export function assertRegistryApprovalGate(proposal: SelectorConfigProposal): void {
  if (proposal.status !== "approved") {
    throw new Error(
      `Hard guardrail: proposal ${proposal.id} has status "${proposal.status}" — only approved proposals may be applied`,
    );
  }
}

export function assertDeterministicFallback(snapshot?: SelectorRuntimeSnapshot): void {
  const fallback =
    snapshot?.config.defaultBehavior.fallbackSurface ?? "dropdown";
  if (fallback !== "dropdown") {
    throw new Error(`Hard guardrail: fallbackSurface must be dropdown, got ${fallback}`);
  }
}

export function assertNoOrphanApprovedProposals(
  registry: PromotionRegistryState,
  effectiveResult: EffectiveConfigBuildResult,
): void {
  const approvedIds = registry.proposals.filter((p) => p.status === "approved").map((p) => p.id);
  const appliedSet = new Set(effectiveResult.appliedProposalIds);

  for (const id of approvedIds) {
    if (!appliedSet.has(id)) {
      throw new Error(`Hard guardrail: approved proposal ${id} missing from appliedProposalIds`);
    }
  }
}

export function assertSingleActiveSnapshot(manifest: SelectorSnapshotManifest): void {
  if (!manifest.activeVersion?.trim()) {
    throw new Error("Hard guardrail: manifest must define exactly one activeVersion");
  }
  if (!manifest.versions.includes(manifest.activeVersion)) {
    throw new Error(
      `Hard guardrail: activeVersion ${manifest.activeVersion} not listed in manifest.versions`,
    );
  }
}

export function assertSnapshotImmutability(exists: boolean, version: string): void {
  if (exists) {
    throw new Error(`Hard guardrail: snapshot ${version} already exists and is immutable`);
  }
}

export function runPrePublishGuardrails(
  registry: PromotionRegistryState,
  effectiveResult: EffectiveConfigBuildResult,
  snapshot: SelectorRuntimeSnapshot,
): void {
  assertDeterministicFallback(snapshot);
  assertNoOrphanApprovedProposals(registry, effectiveResult);
  for (const id of effectiveResult.appliedProposalIds) {
    const proposal = registry.proposals.find((p) => p.id === id);
    if (proposal) assertRegistryApprovalGate(proposal);
  }
}

export function snapshotsEqual(a: SelectorConfigMergeSlice, b: SelectorConfigMergeSlice): boolean {
  if (a.sheetMinOptions !== b.sheetMinOptions) return false;
  const keysA = Object.keys(a.rolloutByDomain).sort();
  const keysB = Object.keys(b.rolloutByDomain).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    if (keysA[i] !== keysB[i]) return false;
    if (a.rolloutByDomain[keysA[i]!] !== b.rolloutByDomain[keysB[i]!]) return false;
  }
  return true;
}

export function diffSnapshots(
  expected: SelectorConfigMergeSlice,
  actual: SelectorConfigMergeSlice,
): string[] {
  const diff: string[] = [];
  if (expected.sheetMinOptions !== actual.sheetMinOptions) {
    diff.push(
      `sheetMinOptions: expected ${expected.sheetMinOptions}, actual ${actual.sheetMinOptions}`,
    );
  }
  const domains = new Set([
    ...Object.keys(expected.rolloutByDomain),
    ...Object.keys(actual.rolloutByDomain),
  ]);
  for (const domain of [...domains].sort()) {
    const exp = expected.rolloutByDomain[domain];
    const act = actual.rolloutByDomain[domain];
    if (exp !== act) {
      diff.push(`rolloutByDomain.${domain}: expected ${exp ?? "undefined"}, actual ${act ?? "undefined"}`);
    }
  }
  return diff;
}

/** @deprecated v5.2 — managed region removed */
export function assertEngineConfigManagedRegionOnly(): never {
  throw new Error("assertEngineConfigManagedRegionOnly removed in v5.2 — use assertSingleActiveSnapshot");
}

/** @deprecated v5.2 */
export function runPreApplyGuardrails(
  registry: PromotionRegistryState,
  effectiveResult: EffectiveConfigBuildResult,
): void {
  runPrePublishGuardrails(registry, effectiveResult, {
    version: "guardrail-check",
    timestamp: 0,
    config: {
      rolloutByDomain: effectiveResult.snapshot.rolloutByDomain,
      thresholds: {
        sheetMinOptions: effectiveResult.snapshot.sheetMinOptions,
        optionCountBands: [5, 20, 100],
      },
      defaultBehavior: {
        fallbackSurface: "dropdown",
        mobileSheetEnabled: true,
        defaultMode: "default",
        defaultDomain: "unknown",
      },
    },
    provenance: {
      appliedProposals: effectiveResult.appliedProposalIds,
      ignoredProposals: [],
      registryVersion: effectiveResult.mergeVersion,
    },
  });
}
