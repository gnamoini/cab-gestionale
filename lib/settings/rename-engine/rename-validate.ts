import type { RenamePlan, RenameImpact, RenameImpactItem, ValidationResult } from "@/lib/settings/rename-engine/types";
import { resolveOperations } from "@/lib/settings/rename-engine/rename-operation-registry";
import { detectRenameConflicts } from "@/lib/settings/rename-engine/rename-conflict";
import { detectSemanticCollision } from "@/lib/settings/rename-engine/rename-semantic-collision";
import { detectDuplicateTargetCollision } from "@/lib/settings/rename-engine/duplicate-target-policy";

export function validateRenamePlan(
  plan: RenamePlan,
  context: {
    existingLabels: readonly string[];
    existingEntityKeys?: readonly string[];
    aliasLabels?: readonly string[];
    catalogBeforeRename?: readonly string[];
  },
): ValidationResult {
  const checks: ValidationResult["checks"] = [];
  const duplicateTarget = detectDuplicateTargetCollision({
    kind: plan.kind,
    oldLabel: plan.oldLabel,
    newLabel: plan.newLabel,
    catalogBeforeRename: context.catalogBeforeRename,
  });
  if (duplicateTarget.blocked && duplicateTarget.message) {
    checks.push({
      name: "duplicate_target_policy",
      status: "fail",
      message: duplicateTarget.message,
    });
    return { status: "blocked", checks };
  }
  const conflicts = detectRenameConflicts(plan, context);
  if (conflicts.blocked) {
    for (const c of conflicts.conflicts) {
      checks.push({ name: c.code, status: "fail", message: c.message });
    }
    return { status: "blocked", checks };
  }
  checks.push({ name: "no_name_collision", status: "pass" });
  checks.push({ name: "entity_key_stable", status: "pass" });
  checks.push({ name: "alias_available", status: "pass" });

  const semantic = detectSemanticCollision(plan, context.existingLabels);
  if (semantic.hasCollision) {
    for (const item of semantic.items) {
      checks.push({
        name: "semantic_collision",
        status: "warning",
        message: `Possibile duplicato: "${item.existingLabel}" (somiglianza ${item.similarity}%)`,
      });
    }
    return { status: "warning", checks };
  }
  checks.push({ name: "no_merge_required", status: "pass" });
  return { status: "ok", checks };
}

export function buildImpactFromCounts(counts: RenameImpactItem[]): RenameImpact {
  const totalUpdatable = counts.filter((c) => c.policy === "live").reduce((s, c) => s + c.updatable, 0);
  const totalProtected = counts.reduce((s, c) => s + c.protected, 0);
  const totalScanned = counts.reduce((s, c) => s + c.total, 0);
  return { items: counts, totalUpdatable, totalProtected, totalScanned };
}

export function emptyImpactForPlan(plan: RenamePlan): RenameImpact {
  const items: RenameImpactItem[] = resolveOperations(plan.operationIds).map((op) => ({
    operationId: op.id,
    table: op.table,
    policy: op.policy,
    updatable: 0,
    protected: 0,
    total: 0,
  }));
  return buildImpactFromCounts(items);
}
