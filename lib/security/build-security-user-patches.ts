import { buildInitialModuleDraft } from "@/lib/security/user-module-permissions";
import { resolveRole } from "@/lib/auth/rbac";
import {
  modulePermissionsPayloadFromDraft,
  snapshotModuleDraft,
  type ModulePermissionDraftRow,
} from "@/lib/security/user-module-permissions";
import { normalizeUsername } from "@/src/lib/auth/username";
import type {
  SecurityUserBatchPatch,
  SecurityUserPermissionRow,
} from "@/src/actions/security-users-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export type EditableSecurityUser = SecurityUserPermissionRow;

export function rowsSnapshot(rows: EditableSecurityUser[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      nome: r.nome.trim(),
      cognome: r.cognome?.trim() || null,
      username: normalizeUsername(r.username ?? ""),
      ruolo: r.ruolo,
      clienteRef: r.clienteRef,
      clientLavorazioniAccessFromRole: r.clientLavorazioniAccessFromRole,
    })),
  );
}

export function buildSecurityUserPatches(
  saved: EditableSecurityUser[],
  draft: EditableSecurityUser[],
  savedModuleSnapshots: Record<string, string>,
  draftModuleDrafts: Record<string, ModulePermissionDraftRow[]>,
  permissionRows: UserPermissionRow[],
): SecurityUserBatchPatch[] {
  const savedById = new Map(saved.map((r) => [r.id, r]));
  const patches: SecurityUserBatchPatch[] = [];

  for (const row of draft) {
    const orig = savedById.get(row.id);
    if (!orig) continue;
    const patch: SecurityUserBatchPatch = { userId: row.id };
    let dirty = false;

    if (row.nome.trim() !== orig.nome.trim()) {
      patch.nome = row.nome.trim();
      dirty = true;
    }
    const nextCognome = row.cognome?.trim() || null;
    const origCognome = orig.cognome?.trim() || null;
    if (nextCognome !== origCognome) {
      patch.cognome = nextCognome;
      dirty = true;
    }
    const nextUsername = normalizeUsername(row.username ?? "");
    const origUsername = normalizeUsername(orig.username ?? "");
    if (nextUsername !== origUsername) {
      patch.username = nextUsername;
      dirty = true;
    }
    const roleChanged = row.ruolo !== orig.ruolo;
    if (roleChanged) {
      patch.ruolo = row.ruolo;
      patch.clearModulePermissions = true;
      dirty = true;
    }
    const clienteRefChanged = (row.clienteRef ?? null) !== (orig.clienteRef ?? null);
    if (clienteRefChanged) {
      patch.clienteRef = row.clienteRef ?? null;
      dirty = true;
    }
    const savedModSnap =
      savedModuleSnapshots[row.id] ??
      snapshotModuleDraft(buildInitialModuleDraft(orig.ruolo, orig.id, permissionRows));
    const draftMod = draftModuleDrafts[row.id];
    const draftModSnap = draftMod ? snapshotModuleDraft(draftMod) : savedModSnap;
    if (!roleChanged && draftModSnap !== savedModSnap && draftMod) {
      patch.modulePermissions = modulePermissionsPayloadFromDraft(resolveRole(row.ruolo), draftMod);
      dirty = true;
    }

    if (dirty) patches.push(patch);
  }
  return patches;
}
