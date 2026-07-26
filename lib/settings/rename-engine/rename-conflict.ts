import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import type { RenameConflictReport, RenamePlan } from "@/lib/settings/rename-engine/types";

export function detectRenameConflicts(
  plan: RenamePlan,
  context: {
    existingLabels: readonly string[];
    existingEntityKeys?: readonly string[];
    aliasLabels?: readonly string[];
  },
): RenameConflictReport {
  const conflicts: RenameConflictReport["conflicts"] = [];
  const { newLabel, oldLabel, entityKey } = plan;

  const duplicate = findExactEntityInPool(newLabel, context.existingLabels, { exclude: oldLabel });
  if (duplicate) {
    conflicts.push({
      code: "name_exists",
      message: `Esiste già un elemento con nome "${duplicate}".`,
    });
  }

  const newKey = buildClienteEntityKey(newLabel);
  if (entityKey && newKey && newKey !== entityKey) {
    const collision = context.existingEntityKeys?.find((k) => k === newKey && k !== entityKey);
    if (collision) {
      conflicts.push({
        code: "entity_key_collision",
        message: `La normalizzazione di "${newLabel}" collide con un'altra entità.`,
      });
    }
  }

  if (context.aliasLabels?.some((a) => a.trim().toLowerCase() === newLabel.trim().toLowerCase())) {
    conflicts.push({
      code: "alias_collision",
      message: `"${newLabel}" è già registrato come alias.`,
    });
  }

  return { blocked: conflicts.length > 0, conflicts };
}
