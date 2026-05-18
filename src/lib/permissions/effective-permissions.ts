import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { RuoloProfile, UserPermissionRow } from "@/src/types/supabase-tables";
import { modulePermissionForRole, normalizeRole } from "@/src/lib/auth/permissions";

export type EffectiveModulePermission = {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
};

/** Merge righe DB legacy con fallback ruolo ufficiale (`admin` / `operatore` / `ospite`). */
export function buildEffectivePermissionsByModule(
  ruolo: RuoloProfile | null | undefined,
  _rows: UserPermissionRow[] | undefined,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  const baseRole = normalizeRole(ruolo);

  const out = {} as Record<GestionalePermissionModule, EffectiveModulePermission>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    out[m] = modulePermissionForRole(baseRole, m);
  }

  return out;
}
