import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { RuoloUtente, UserPermissionRow } from "@/src/types/supabase-tables";
import { resolveRole, roleModuleDefault } from "@/lib/rbac";

export type EffectiveModulePermission = {
  canRead: boolean;
  canWrite: boolean;
};

function isGestionalePermissionModule(module: string): module is GestionalePermissionModule {
  return (GESTIONALE_PERMISSION_MODULES as readonly string[]).includes(module);
}

/** RBAC_PRECEDENCE steps 2→3: override user_permissions → roleModuleDefault. */
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
      };
    } else {
      out[m] = roleModuleDefault(baseRole, m);
    }
  }

  return out;
}
