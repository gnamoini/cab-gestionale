/**
 * @advisory v5.2 — deterministic runtime snapshot builder.
 */
import type {
  PromotionRegistryState,
  SelectorConfigMergeSlice,
  SelectorConfigProposal,
  SelectorEngineConfigShape,
  SelectorRuntimeSnapshot,
} from "@/lib/selector-core/types";

export const SELECTOR_ENGINE_CONFIG_BASE: SelectorConfigMergeSlice = {
  rolloutByDomain: {
    lavorazioni: "ENABLED",
    addetti: "ENABLED",
    mezzi: "ENABLED",
    magazzino: "ENABLED",
    schede: "ENABLED",
    report: "DISABLED",
    dashboard_filters: "PARTIAL",
    security: "GRADUAL",
    dipendenti: "ENABLED",
  },
  sheetMinOptions: 20,
};

export const SELECTOR_BASE_CONFIG_SHAPE: SelectorEngineConfigShape = {
  rolloutByDomain: { ...SELECTOR_ENGINE_CONFIG_BASE.rolloutByDomain },
  thresholds: {
    sheetMinOptions: SELECTOR_ENGINE_CONFIG_BASE.sheetMinOptions,
    optionCountBands: [5, 20, 100] as const,
  },
  defaultBehavior: {
    fallbackSurface: "dropdown",
    mobileSheetEnabled: true,
    defaultMode: "default",
    defaultDomain: "unknown",
  },
};

export const SELECTOR_BASE_SNAPSHOT_V0: SelectorRuntimeSnapshot = {
  version: "v0",
  timestamp: 0,
  config: SELECTOR_BASE_CONFIG_SHAPE,
  provenance: {
    appliedProposals: [],
    ignoredProposals: [],
    registryVersion: 0,
  },
};

function sortApprovedProposals(proposals: readonly SelectorConfigProposal[]): SelectorConfigProposal[] {
  return proposals
    .filter((p) => p.status === "approved")
    .slice()
    .sort((a, b) => {
      const domainCmp = a.targetDomain.localeCompare(b.targetDomain);
      if (domainCmp !== 0) return domainCmp;
      const idCmp = a.id.localeCompare(b.id);
      if (idCmp !== 0) return idCmp;
      return a.version - b.version;
    });
}

export function mergeApprovedProposals(
  base: SelectorConfigMergeSlice,
  proposals: readonly SelectorConfigProposal[],
): { slice: SelectorConfigMergeSlice; appliedProposalIds: string[]; ignoredProposalIds: string[] } {
  const rolloutByDomain = { ...base.rolloutByDomain };
  let sheetMinOptions = base.sheetMinOptions;
  const appliedProposalIds: string[] = [];

  for (const proposal of sortApprovedProposals(proposals)) {
    if (proposal.proposedChange.rolloutAdjustment) {
      rolloutByDomain[proposal.targetDomain] = proposal.proposedChange.rolloutAdjustment;
    }
    if (proposal.proposedChange.thresholdAdjustment !== undefined) {
      sheetMinOptions = proposal.proposedChange.thresholdAdjustment;
    }
    appliedProposalIds.push(proposal.id);
  }

  const ignoredProposalIds = proposals
    .filter((p) => p.status !== "approved")
    .map((p) => p.id)
    .sort();

  return {
    slice: { rolloutByDomain, sheetMinOptions },
    appliedProposalIds,
    ignoredProposalIds,
  };
}

export function mergeSliceToEngineConfigShape(slice: SelectorConfigMergeSlice): SelectorEngineConfigShape {
  return {
    rolloutByDomain: { ...slice.rolloutByDomain },
    thresholds: {
      sheetMinOptions: slice.sheetMinOptions,
      optionCountBands: [5, 20, 100] as const,
    },
    defaultBehavior: { ...SELECTOR_BASE_CONFIG_SHAPE.defaultBehavior },
  };
}

export type BuildSelectorRuntimeSnapshotOptions = {
  version?: string;
  timestamp?: number;
  base?: SelectorConfigMergeSlice;
};

export function buildSelectorRuntimeSnapshot(
  registry: Pick<PromotionRegistryState, "proposals" | "version">,
  options: BuildSelectorRuntimeSnapshotOptions = {},
): SelectorRuntimeSnapshot {
  const base = options.base ?? SELECTOR_ENGINE_CONFIG_BASE;
  const { slice, appliedProposalIds, ignoredProposalIds } = mergeApprovedProposals(
    base,
    registry.proposals,
  );

  const version = options.version ?? `snap-${registry.version}`;
  const timestamp = options.timestamp ?? Date.now();

  return {
    version,
    timestamp,
    config: mergeSliceToEngineConfigShape(slice),
    provenance: {
      appliedProposals: appliedProposalIds,
      ignoredProposals: ignoredProposalIds,
      registryVersion: registry.version,
    },
  };
}

/** Deterministic snapshot for reproducibility checks (stable timestamp). */
export function buildSelectorRuntimeSnapshotDeterministic(
  registry: Pick<PromotionRegistryState, "proposals" | "version">,
  options: BuildSelectorRuntimeSnapshotOptions = {},
): SelectorRuntimeSnapshot {
  return buildSelectorRuntimeSnapshot(registry, { ...options, timestamp: 0 });
}

export function runtimeSnapshotsEqual(a: SelectorRuntimeSnapshot, b: SelectorRuntimeSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffRuntimeSnapshots(a: SelectorRuntimeSnapshot, b: SelectorRuntimeSnapshot): string[] {
  const diff: string[] = [];
  if (a.version !== b.version) diff.push(`version: ${a.version} vs ${b.version}`);
  if (a.config.thresholds.sheetMinOptions !== b.config.thresholds.sheetMinOptions) {
    diff.push(
      `sheetMinOptions: ${a.config.thresholds.sheetMinOptions} vs ${b.config.thresholds.sheetMinOptions}`,
    );
  }
  const domains = new Set([
    ...Object.keys(a.config.rolloutByDomain),
    ...Object.keys(b.config.rolloutByDomain),
  ]);
  for (const domain of [...domains].sort()) {
    const av = a.config.rolloutByDomain[domain];
    const bv = b.config.rolloutByDomain[domain];
    if (av !== bv) diff.push(`rolloutByDomain.${domain}: ${av} vs ${bv}`);
  }
  if (JSON.stringify(a.provenance) !== JSON.stringify(b.provenance)) {
    diff.push("provenance mismatch");
  }
  return diff;
}
