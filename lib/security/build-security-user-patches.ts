import { resolveRole } from "@/lib/auth/rbac";
import {
  buildInitialPageDraft,
  pagePermissionsPayloadFromDraft,
  snapshotPageDraft,
  type PagePermissionDraftRow,
} from "@/lib/security/user-page-permissions";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { normalizeUsername } from "@/src/lib/auth/username";
import type {
  SecurityUserBatchPatch,
  SecurityUserPermissionRow,
} from "@/src/actions/security-users-permissions";

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
  savedPageSnapshots: Record<string, string>,
  draftPageDrafts: Record<string, PagePermissionDraftRow[]>,
  userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[],
  rolePageAccessByRole: Record<string, Record<string, PageAccessLevel>>,
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
      patch.clearPagePermissions = true;
      dirty = true;
    }
    const clienteRefChanged = (row.clienteRef ?? null) !== (orig.clienteRef ?? null);
    if (clienteRefChanged) {
      patch.clienteRef = row.clienteRef ?? null;
      dirty = true;
    }

    const roleKey = resolveRole(orig.ruolo);
    const rolePageAccess = rolePageAccessByRole[roleKey] ?? {};
    const savedPageSnap =
      savedPageSnapshots[row.id] ??
      snapshotPageDraft(
        buildInitialPageDraft(roleKey, rolePageAccess, orig.id, userPageOverrideRows),
      );
    const draftPage = draftPageDrafts[row.id];
    const draftPageSnap = draftPage ? snapshotPageDraft(draftPage) : savedPageSnap;
    if (!roleChanged && draftPageSnap !== savedPageSnap && draftPage) {
      patch.pagePermissions = pagePermissionsPayloadFromDraft(draftPage);
      dirty = true;
    }

    if (dirty) patches.push(patch);
  }
  return patches;
}
