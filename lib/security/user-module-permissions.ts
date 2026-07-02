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
  document_capture: "Acquisizione documenti",
};

export type ModulePermissionDraftRow = {
  module: GestionalePermissionModule;
  label: string;
  roleCanRead: boolean;
  roleCanWrite: boolean;
  canRead: boolean;
  canWrite: boolean;
  isCustomized: boolean;
  overrideRead: "inherit" | "allow" | "deny";
  overrideWrite: "inherit" | "allow" | "deny";
};

export type ModulePermissionPersistPlan = {
  overrides: { permissionKey: string; effect: "allow" | "deny" }[];
  deleteAll: boolean;
};

function rowsForUser(rows: UserPermissionRow[] | undefined, userId: string): UserPermissionRow[] {
  return (rows ?? []).filter((r) => r.user_id === userId);
}

function roleDefaultFromKeys(
  rolePermissionKeys: string[],
  module: GestionalePermissionModule,
): { canRead: boolean; canWrite: boolean } {
  const set = new Set(rolePermissionKeys);
  return {
    canRead: set.has(`${module}.read`),
    canWrite: set.has(`${module}.write`),
  };
}

function userOverrideEffect(
  userRows: UserPermissionRow[],
  module: GestionalePermissionModule,
  op: "read" | "write",
): "inherit" | "allow" | "deny" {
  const key = `${module}.${op}`;
  const row = userRows.find((r) => r.permissions?.key === key);
  if (!row) return "inherit";
  return row.effect === "allow" ? "allow" : "deny";
}

function effectiveFromOverride(
  roleVal: boolean,
  override: "inherit" | "allow" | "deny",
): boolean {
  if (override === "allow") return true;
  if (override === "deny") return false;
  return roleVal;
}

export function computeModulePermissionDraft(
  rolePermissionKeys: string[],
  userId: string,
  allPermissionRows: UserPermissionRow[] | undefined,
): ModulePermissionDraftRow[] {
  const userRows = rowsForUser(allPermissionRows, userId);

  return GESTIONALE_PERMISSION_MODULES.map((module) => {
    const roleDef = roleDefaultFromKeys(rolePermissionKeys, module);
    const overrideRead = userOverrideEffect(userRows, module, "read");
    const overrideWrite = userOverrideEffect(userRows, module, "write");
    const canRead = effectiveFromOverride(roleDef.canRead, overrideRead);
    const canWrite = canRead ? effectiveFromOverride(roleDef.canWrite, overrideWrite) : false;
    const isCustomized =
      overrideRead !== "inherit" ||
      overrideWrite !== "inherit" ||
      canRead !== roleDef.canRead ||
      canWrite !== roleDef.canWrite;

    return {
      module,
      label: MODULE_PAGE_LABELS[module],
      roleCanRead: roleDef.canRead,
      roleCanWrite: roleDef.canWrite,
      canRead,
      canWrite,
      isCustomized,
      overrideRead,
      overrideWrite,
    };
  });
}

export function hasModulePermissionOverrides(
  rolePermissionKeys: string[],
  userId: string,
  allPermissionRows: UserPermissionRow[] | undefined,
): boolean {
  return computeModulePermissionDraft(rolePermissionKeys, userId, allPermissionRows).some((r) => r.isCustomized);
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
  return JSON.stringify(rows.map((r) => ({ m: r.module, r: r.canRead, w: r.canWrite })));
}

/** Confronta draft con permessi ruolo → override allow/deny solo dove diverge dal ruolo. */
export function planModulePermissionPersist(
  rolePermissionKeys: string[],
  draft: ModulePermissionDraftRow[],
): ModulePermissionPersistPlan {
  const overrides: ModulePermissionPersistPlan["overrides"] = [];

  for (const row of draft.map(normalizeModuleDraftRow)) {
    const roleDef = roleDefaultFromKeys(rolePermissionKeys, row.module);
    if (row.canRead !== roleDef.canRead) {
      overrides.push({
        permissionKey: `${row.module}.read`,
        effect: row.canRead ? "allow" : "deny",
      });
    }
    if (row.canWrite !== roleDef.canWrite) {
      overrides.push({
        permissionKey: `${row.module}.write`,
        effect: row.canWrite ? "allow" : "deny",
      });
    }
  }

  return {
    overrides,
    deleteAll: overrides.length === 0,
  };
}

export function modulePermissionsPayloadFromDraft(
  rolePermissionKeys: string[],
  draft: ModulePermissionDraftRow[],
): { module: GestionalePermissionModule; canRead: boolean; canWrite: boolean }[] | null {
  const plan = planModulePermissionPersist(rolePermissionKeys, draft);
  if (plan.deleteAll) return null;
  const modules = new Map<GestionalePermissionModule, { canRead: boolean; canWrite: boolean }>();
  for (const row of draft.map(normalizeModuleDraftRow)) {
    modules.set(row.module, { canRead: row.canRead, canWrite: row.canWrite });
  }
  return [...modules.entries()].map(([module, access]) => ({ module, ...access }));
}

export function buildInitialModuleDraft(
  rolePermissionKeys: string[],
  userId: string,
  permissionRows: UserPermissionRow[],
): ModulePermissionDraftRow[] {
  return computeModulePermissionDraft(rolePermissionKeys, userId, permissionRows);
}
