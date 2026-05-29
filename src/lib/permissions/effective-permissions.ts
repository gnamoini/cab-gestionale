import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { RuoloUtente, UserPermissionRow } from "@/src/types/supabase-tables";
import { modulePermissionForRole, resolveRole } from "@/lib/auth/rbac";

export type EffectiveModulePermission = {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
};

/** Merge righe DB legacy con fallback ruolo ufficiale (`admin` / `operatore` / `ospite`). */
function isGestionalePermissionModule(module: string): module is GestionalePermissionModule {
  return (GESTIONALE_PERMISSION_MODULES as readonly string[]).includes(module);
}

export function buildEffectivePermissionsByModule(
  ruolo: RuoloUtente | null | undefined,
  rows: UserPermissionRow[] | undefined,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  const baseRole = resolveRole(ruolo);
  const rowByModule = new Map<GestionalePermissionModule, UserPermissionRow>();
  for (const row of rows ?? []) {
    if (isGestionalePermissionModule(row.module)) {
      rowByModule.set(row.module, row);
    }
  }

  const out = {} as Record<GestionalePermissionModule, EffectiveModulePermission>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    const row = rowByModule.get(m);
    if (row) {
      out[m] = {
        canRead: row.can_read,
        canWrite: row.can_write,
        canAdmin: row.can_admin,
      };
    } else {
      out[m] = modulePermissionForRole(baseRole, m);
    }
  }

  return out;
}
