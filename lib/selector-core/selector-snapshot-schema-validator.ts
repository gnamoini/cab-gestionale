/**
 * @advisory v5.3 — schema validation gate. Hard block before stage/activate.
 */
import { createHash } from "node:crypto";
import type {
  PromotionRegistryState,
  SelectorDomain,
  SelectorRuntimeSnapshot,
  SnapshotValidationResult,
} from "@/lib/selector-core/types";

const VALID_DOMAINS = new Set<SelectorDomain>([
  "lavorazioni",
  "addetti",
  "mezzi",
  "magazzino",
  "schede",
  "report",
  "dashboard_filters",
  "security",
  "dipendenti",
]);

const VALID_ROLLOUT = new Set(["ENABLED", "DISABLED", "PARTIAL", "GRADUAL"]);

export type SnapshotValidationContext = {
  registry?: Pick<PromotionRegistryState, "proposals">;
};

export function computeSchemaHash(snapshot: SelectorRuntimeSnapshot): string {
  const payload = JSON.stringify({
    rolloutByDomain: snapshot.config.rolloutByDomain,
    sheetMinOptions: snapshot.config.thresholds.sheetMinOptions,
    defaultBehavior: snapshot.config.defaultBehavior,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function validateSnapshot(
  snapshot: SelectorRuntimeSnapshot,
  context: SnapshotValidationContext = {},
): SnapshotValidationResult {
  const errors: string[] = [];

  if (!snapshot.version?.trim()) errors.push("missing version");
  if (!snapshot.config) errors.push("missing config");
  if (!snapshot.provenance) errors.push("missing provenance");

  if (typeof snapshot.timestamp !== "number" || Number.isNaN(snapshot.timestamp)) {
    errors.push("invalid timestamp");
  }

  const { config, provenance } = snapshot;

  const minOpts = config?.thresholds?.sheetMinOptions;
  if (typeof minOpts !== "number" || !Number.isFinite(minOpts) || minOpts < 1) {
    errors.push("sheetMinOptions must be a finite number >= 1");
  }

  if (config?.defaultBehavior?.fallbackSurface !== "dropdown") {
    errors.push("defaultBehavior.fallbackSurface must be dropdown");
  }

  if (config?.rolloutByDomain) {
    for (const [domain, status] of Object.entries(config.rolloutByDomain)) {
      if (!VALID_DOMAINS.has(domain as SelectorDomain)) {
        errors.push(`unknown rollout domain: ${domain}`);
      }
      if (!VALID_ROLLOUT.has(status)) {
        errors.push(`invalid rollout status for ${domain}: ${status}`);
      }
    }
  }

  if (context.registry && provenance?.appliedProposals) {
    for (const proposalId of provenance.appliedProposals) {
      const proposal = context.registry.proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        errors.push(`orphan applied proposal: ${proposalId}`);
      } else if (proposal.status !== "approved") {
        errors.push(`applied proposal ${proposalId} is not approved`);
      }
    }
  }

  if (provenance?.appliedProposals) {
    for (const id of provenance.appliedProposals) {
      if (provenance.ignoredProposals?.includes(id)) {
        errors.push(`proposal ${id} is both applied and ignored`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Snapshot validation failed: ${errors.join("; ")}`);
  }

  return { valid: true, schemaHash: computeSchemaHash(snapshot) };
}

export function validateSnapshotOrThrow(
  snapshot: SelectorRuntimeSnapshot,
  context?: SnapshotValidationContext,
): SnapshotValidationResult {
  return validateSnapshot(snapshot, context);
}

export function attachSchemaHash(snapshot: SelectorRuntimeSnapshot): SelectorRuntimeSnapshot {
  const { schemaHash } = validateSnapshot(snapshot);
  return { ...snapshot, schemaHash };
}
