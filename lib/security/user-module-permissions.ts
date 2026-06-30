import { roleModuleDefault, resolveRole, type AppRole } from "@/lib/rbac";
import {
  GESTIONALE_PERMISSION_MODULES,
  type GestionalePermissionModule,
} from "@/src/lib/permissions/gestionale-modules";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

/** Etichette pagine ERP allineate al menu (moduli `user_permissions`). */
export const MODULE_PAGE_LABELS: Record<GestionalePermissionModule, string> = {
  magazzino: "Magazzino",
  preventivi: "Preventivi",
  lavorazioni: "Lavorazioni",
  mezzi: "Mezzi",
  report: "Report",
  documenti: "Documenti",
  dipendenti: "Dipendenti",
  fatturazione: "Fatturazione",
  ddt: "DDT",
  ordini_fornitori: "Ordini fornitori",
};

export type ModulePermissionDraftRow = {
  module: GestionalePermissionModule;
  label: string;
  roleCanRead: boolean;
  roleCanWrite: boolean;
  canRead: boolean;
  canWrite: boolean;
  isCustomized: boolean;
};

export type ModulePermissionPersistPlan = {
  upserts: { module: GestionalePermissionModule; canRead: boolean; canWrite: boolean }[];
  deleteAll: boolean;
};

function rowsForUser(rows: UserPermissionRow[] | undefined, userId: string): UserPermissionRow[] {
  return (rows ?? []).filter((r) => r.user_id === userId);
}

export function roleDefaultForModule(
  ruolo: AppRole,
  module: GestionalePermissionModule,
): { canRead: boolean; canWrite: boolean } {
  const d = roleModuleDefault(resolveRole(ruolo), module);
  return { canRead: d.canRead, canWrite: d.canWrite };
}

export function computeModulePermissionDraft(
  ruolo: AppRole,
  userId: string,
  allPermissionRows: UserPermissionRow[] | undefined,
): ModulePermissionDraftRow[] {
  const role = resolveRole(ruolo);
  const userRows = rowsForUser(allPermissionRows, userId);
  const byModule = new Map<GestionalePermissionModule, UserPermissionRow>();
  for (const row of userRows) {
    if ((GESTIONALE_PERMISSION_MODULES as readonly string[]).includes(row.module)) {
      byModule.set(row.module as GestionalePermissionModule, row);
    }
  }

  return GESTIONALE_PERMISSION_MODULES.map((module) => {
    const roleDef = roleDefaultForModule(role, module);
    const dbRow = byModule.get(module);
    const canRead = dbRow ? dbRow.can_read : roleDef.canRead;
    const canWrite = dbRow ? dbRow.can_write : roleDef.canWrite;
    const isCustomized =
      dbRow != null &&
      (dbRow.can_read !== roleDef.canRead || dbRow.can_write !== roleDef.canWrite);
    return {
      module,
      label: MODULE_PAGE_LABELS[module],
      roleCanRead: roleDef.canRead,
      roleCanWrite: roleDef.canWrite,
      canRead,
      canWrite: canRead ? canWrite : false,
      isCustomized,
    };
  });
}

export function hasModulePermissionOverrides(
  ruolo: AppRole,
  userId: string,
  allPermissionRows: UserPermissionRow[] | undefined,
): boolean {
  return computeModulePermissionDraft(ruolo, userId, allPermissionRows).some((r) => r.isCustomized);
}

export function normalizeModuleDraftRow(row: ModulePermissionDraftRow): ModulePermissionDraftRow {
  const canRead = row.canRead;
  const canWrite = canRead ? row.canWrite : false;
  return { ...row, canRead, canWrite };
}

export function modulePermissionDraftEquals(a: ModulePermissionDraftRow[], b: ModulePermissionDraftRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (left.module !== right.module || left.canRead !== right.canRead || left.canWrite !== right.canWrite) {
      return false;
    }
  }
  return true;
}

export function snapshotModuleDraft(rows: ModulePermissionDraftRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({ m: r.module, r: r.canRead, w: r.canWrite })),
  );
}

/** Confronta draft con default ruolo → upsert solo dove serve override; deleteAll se nessun override. */
export function planModulePermissionPersist(
  ruolo: AppRole,
  draft: ModulePermissionDraftRow[],
): ModulePermissionPersistPlan {
  const role = resolveRole(ruolo);
  const upserts: ModulePermissionPersistPlan["upserts"] = [];

  for (const row of draft.map(normalizeModuleDraftRow)) {
    const roleDef = roleDefaultForModule(role, row.module);
    const matchesRole = row.canRead === roleDef.canRead && row.canWrite === roleDef.canWrite;
    if (!matchesRole) {
      upserts.push({
        module: row.module,
        canRead: row.canRead,
        canWrite: row.canWrite,
      });
    }
  }

  return {
    upserts,
    deleteAll: upserts.length === 0,
  };
}

export function modulePermissionsPayloadFromDraft(
  ruolo: AppRole,
  draft: ModulePermissionDraftRow[],
): { module: GestionalePermissionModule; canRead: boolean; canWrite: boolean }[] | null {
  const plan = planModulePermissionPersist(ruolo, draft);
  if (plan.deleteAll) return null;
  return plan.upserts;
}
