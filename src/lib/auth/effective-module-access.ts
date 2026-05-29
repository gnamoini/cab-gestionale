import { resolveRole } from "@/lib/auth/rbac";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import {
  buildEffectivePermissionsByModule,
  type EffectiveModulePermission,
} from "@/src/lib/permissions/effective-permissions";
import type { RuoloUtente, UserPermissionRow } from "@/src/types/supabase-tables";

export type ModulePermissionOp = "read" | "write" | "admin";

export function moduleAllows(
  map: Record<GestionalePermissionModule, EffectiveModulePermission>,
  module: GestionalePermissionModule,
  op: ModulePermissionOp,
): boolean {
  const row = map[module];
  if (op === "read") return row.canRead;
  if (op === "write") return row.canWrite;
  return row.canAdmin;
}

export function buildModuleAccessMap(
  ruolo: string | RuoloUtente | null | undefined,
  rows: UserPermissionRow[] | null | undefined,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  return buildEffectivePermissionsByModule(resolveRole(ruolo), rows ?? undefined);
}
