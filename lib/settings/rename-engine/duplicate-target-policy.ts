import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import { settingsNormKey } from "@/lib/settings/settings-list-duplicate";

export type DuplicateTargetPolicy = "merge" | "block" | "manual_review";

const ASSOCIATION_RENAME_KINDS = new Set<SettingsRenameKind>(["cliente", "utilizzatore", "cantiere"]);

export function duplicateTargetPolicyForKind(kind: SettingsRenameKind): DuplicateTargetPolicy {
  if (ASSOCIATION_RENAME_KINDS.has(kind)) return "manual_review";
  return "block";
}

/** Both old and new labels existed in catalog before rename — risky merge. */
export function detectDuplicateTargetCollision(input: {
  kind: SettingsRenameKind;
  oldLabel: string;
  newLabel: string;
  catalogBeforeRename?: readonly string[];
}): { blocked: boolean; policy: DuplicateTargetPolicy; message?: string } {
  const policy = duplicateTargetPolicyForKind(input.kind);
  const catalog = input.catalogBeforeRename ?? [];
  const oldKey = settingsNormKey(input.oldLabel);
  const newKey = settingsNormKey(input.newLabel);
  if (!oldKey || !newKey || oldKey === newKey) {
    return { blocked: false, policy };
  }
  const hadOld = catalog.some((l) => settingsNormKey(l) === oldKey);
  const hadNew = catalog.some((l) => settingsNormKey(l) === newKey);
  if (!hadOld || !hadNew) return { blocked: false, policy };
  const message = `«${input.newLabel}» esiste già nel catalogo insieme a «${input.oldLabel}». Rimuovi il duplicato o unifica manualmente prima di propagare.`;
  return { blocked: policy === "manual_review" || policy === "block", policy, message };
}

export function isAssociationRenameKind(kind: SettingsRenameKind): boolean {
  return ASSOCIATION_RENAME_KINDS.has(kind);
}
