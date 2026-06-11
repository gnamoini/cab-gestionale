/**
 * @advisory v5.3.2 — deterministic snapshot store GC policy. Node/fs only.
 * @advisory v5.5 — rule-based GC via unified causal model (no graph public surface).
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildGcLineageInput,
  buildUnifiedSelectorCausalModel,
  isGcReachableInCausalModel,
  isLineageReachableFromActive,
  wasSnapshotValidAt,
  type GcLineageInput,
  type UnifiedSelectorCausalModel,
} from "@/lib/selector-core/selector-core-causal-model";
import type { LifecycleClassification } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import { MIN_ROLLBACK_BUFFER } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import type {
  SelectorSnapshotManifest,
  SelectorSnapshotPointer,
  SnapshotRetentionClass,
} from "@/lib/selector-core/types";

export const RETENTION_DAYS = 30;

export type GcPlanEntry = {
  version: string;
  retentionClass: SnapshotRetentionClass;
  reason: string;
};

export type GcPlan = {
  candidates: GcPlanEntry[];
  protected: string[];
  blockedByDependency: string[];
  temporalBlocked?: string[];
  dryRun: boolean;
};

export type GcApplyOptions = {
  apply?: boolean;
  storeDir: string;
};

export type GcApplyResult = {
  deleted: string[];
  skipped: string[];
  dryRun: boolean;
};

/** @deprecated v5.5 — internal lineage input; use buildGcLineageInput */
export type SnapshotDependencyGraph = GcLineageInput;

const PROTECTED_CLASSES = new Set<SnapshotRetentionClass>([
  "active",
  "previous_safe",
  "pinned",
]);

/** @deprecated v5.5 — use buildGcLineageInput from selector-core-causal-model */
export function buildSnapshotDependencyGraph(
  manifest: SelectorSnapshotManifest,
  classification: LifecycleClassification,
): GcLineageInput {
  return buildGcLineageInput(manifest, classification);
}

/** @deprecated v5.5 — use isLineageReachableFromActive */
export function isReachableInGraph(
  version: string,
  root: string,
  graph: GcLineageInput,
): boolean {
  return isLineageReachableFromActive(version, root, graph);
};

type GcRuleContext = {
  manifest: SelectorSnapshotManifest;
  classification: LifecycleClassification;
  lineage: GcLineageInput;
  retentionDays: number;
  cutoff: number;
  manifestUpdatedAt: number;
};

function evaluateGcRules(ctx: GcRuleContext): {
  protected: string[];
  lineageBlocked: string[];
  candidates: GcPlanEntry[];
} {
  const protectedVersions = new Set([
    ...ctx.lineage.protected,
    ...ctx.classification.rollbackSafeVersions,
  ]);

  const candidates: GcPlanEntry[] = [];
  const lineageBlocked: string[] = [];

  for (const [version, retentionClass] of Object.entries(ctx.classification.retention)) {
    if (PROTECTED_CLASSES.has(retentionClass)) continue;
    if (protectedVersions.has(version)) continue;
    if (ctx.classification.rollbackSafeVersions.includes(version)) continue;

    if (isLineageReachableFromActive(version, ctx.manifest.activeVersion, ctx.lineage)) {
      lineageBlocked.push(version);
      continue;
    }

    const isArchived = retentionClass === "archived";
    const isStale =
      Number.isFinite(ctx.manifestUpdatedAt) && ctx.manifestUpdatedAt < ctx.cutoff;

    if (isArchived || isStale) {
      candidates.push({
        version,
        retentionClass,
        reason: isStale ? "outside_retention_window" : "archived_unreferenced",
      });
    }
  }

  return {
    protected: [...protectedVersions].sort(),
    lineageBlocked: [...new Set(lineageBlocked)].sort(),
    candidates,
  };
}

export function planSnapshotGc(
  classification: LifecycleClassification,
  manifest: SelectorSnapshotManifest,
  options?: { retentionDays?: number; now?: Date },
): GcPlan {
  const retentionDays = options?.retentionDays ?? RETENTION_DAYS;
  const now = options?.now ?? new Date();
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const manifestUpdatedAt = Date.parse(manifest.updatedAt);
  const lineage = buildGcLineageInput(manifest, classification);

  const rules = evaluateGcRules({
    manifest,
    classification,
    lineage,
    retentionDays,
    cutoff,
    manifestUpdatedAt,
  });

  return {
    candidates: rules.candidates,
    protected: rules.protected,
    blockedByDependency: rules.lineageBlocked,
    dryRun: true,
  };
}

export function applySnapshotGc(plan: GcPlan, options: GcApplyOptions): GcApplyResult {
  const deleted: string[] = [];
  const skipped: string[] = [];

  if (!options.apply) {
    return {
      deleted: [],
      skipped: [
        ...plan.candidates.map((entry) => entry.version),
        ...plan.blockedByDependency,
      ],
      dryRun: true,
    };
  }

  for (const version of plan.blockedByDependency) {
    skipped.push(version);
  }

  for (const entry of plan.candidates) {
    if (plan.protected.includes(entry.version) || plan.blockedByDependency.includes(entry.version)) {
      skipped.push(entry.version);
      continue;
    }
    const filePath = path.join(options.storeDir, `${entry.version}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted.push(entry.version);
    } else {
      skipped.push(entry.version);
    }
  }

  return { deleted, skipped, dryRun: false };
}

export { MIN_ROLLBACK_BUFFER };

export function planSnapshotGcAtTimestamp(
  classification: LifecycleClassification,
  manifest: SelectorSnapshotManifest,
  timestamp: number,
  options?: { retentionDays?: number },
): GcPlan {
  return planSnapshotGc(classification, manifest, {
    ...options,
    now: new Date(timestamp),
  });
}

export type GcTemporalSafetyResult = {
  safe: boolean;
  blocked: string[];
  reasons: string[];
};

export function validateGcTemporalSafety(
  plan: GcPlan,
  causalModel: UnifiedSelectorCausalModel,
  timestamp: number,
  activeVersion: string,
): GcTemporalSafetyResult {
  const blocked: string[] = [];
  const reasons: string[] = [];

  for (const entry of plan.candidates) {
    if (wasSnapshotValidAt(entry.version, timestamp, causalModel)) {
      blocked.push(entry.version);
      reasons.push(`${entry.version} was valid at ${timestamp}`);
    }

    if (isGcReachableInCausalModel(causalModel, activeVersion, entry.version)) {
      blocked.push(entry.version);
      reasons.push(
        `${entry.version} reachable in unified causal model from ${activeVersion}`,
      );
    }
  }

  const uniqueBlocked = [...new Set(blocked)].sort();
  return {
    safe: uniqueBlocked.length === 0,
    blocked: uniqueBlocked,
    reasons,
  };
}

export function planSnapshotGcWithTemporalValidation(
  classification: LifecycleClassification,
  manifest: SelectorSnapshotManifest,
  pointer: SelectorSnapshotPointer,
  timestamp: number,
  options?: { retentionDays?: number },
): GcPlan {
  const plan = planSnapshotGcAtTimestamp(classification, manifest, timestamp, options);
  const lineage = buildGcLineageInput(manifest, classification);
  const causalModel = buildUnifiedSelectorCausalModel({
    gcLineage: lineage,
    temporalManifest: manifest,
    temporalPointer: pointer,
    temporalClassification: classification,
  });
  const safety = validateGcTemporalSafety(
    plan,
    causalModel,
    timestamp,
    manifest.activeVersion,
  );

  const temporalBlocked = safety.blocked;
  const candidates = plan.candidates.filter((c) => !temporalBlocked.includes(c.version));

  return {
    ...plan,
    candidates,
    temporalBlocked,
  };
}
