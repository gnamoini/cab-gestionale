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
export function buildEffectivePermissionsByModule(
  ruolo: RuoloUtente | null | undefined,
  _rows: UserPermissionRow[] | undefined,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  const baseRole = resolveRole(ruolo);

  const out = {} as Record<GestionalePermissionModule, EffectiveModulePermission>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    out[m] = modulePermissionForRole(baseRole, m);
  }

  return out;
}
