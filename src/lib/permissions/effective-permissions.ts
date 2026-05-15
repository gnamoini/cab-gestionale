import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { RuoloProfile, UserPermissionRow } from "@/src/types/supabase-tables";

export type EffectiveModulePermission = {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
};

function roleDefaults(ruolo: RuoloProfile): Omit<EffectiveModulePermission, never> {
  if (ruolo === "admin") return { canRead: true, canWrite: true, canAdmin: true };
  if (ruolo === "viewer") return { canRead: true, canWrite: false, canAdmin: false };
  return { canRead: true, canWrite: true, canAdmin: false };
}

/** Merge righe DB con fallback ruolo (stessa logica server-side di `user_effective_can`). */
export function buildEffectivePermissionsByModule(
  ruolo: RuoloProfile | null | undefined,
  rows: UserPermissionRow[] | undefined,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  const baseRole = ruolo ?? "viewer";
  const defaults = roleDefaults(baseRole === "admin" || baseRole === "tecnico" || baseRole === "viewer" ? baseRole : "tecnico");

  const out = {} as Record<GestionalePermissionModule, EffectiveModulePermission>;
  for (const m of GESTIONALE_PERMISSION_MODULES) {
    out[m] = { ...defaults };
  }

  if (baseRole === "admin") {
    return out;
  }

  for (const r of rows ?? []) {
    if (!(GESTIONALE_PERMISSION_MODULES as readonly string[]).includes(r.module)) continue;
    const m = r.module as GestionalePermissionModule;
    out[m] = {
      canRead: r.can_read,
      canWrite: r.can_write,
      canAdmin: r.can_admin,
    };
  }
  return out;
}
