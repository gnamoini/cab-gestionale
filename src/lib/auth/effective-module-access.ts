import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import { buildEffectivePermissionsByModule } from "@/src/lib/permissions/effective-permissions";
import { resolveRole } from "@/lib/auth/rbac";

export type ModulePermissionOp = "read" | "write";

export function moduleAllows(
  map: Record<GestionalePermissionModule, import("@/src/lib/permissions/effective-permissions").EffectiveModulePermission>,
  module: GestionalePermissionModule,
  op: ModulePermissionOp,
): boolean {
  const row = map[module];
  return op === "read" ? row.canRead : row.canWrite;
}

export function buildModuleAccessMap(input: {
  userId: string;
  roleKey: string | null | undefined;
  rolePermissionKeys: string[];
  rows: UserPermissionRow[] | null | undefined;
}): Record<GestionalePermissionModule, import("@/src/lib/permissions/effective-permissions").EffectiveModulePermission> {
  const overrides = (input.rows ?? [])
    .map((row) => {
      const key = row.permissions?.key;
      if (!key || (row.effect !== "allow" && row.effect !== "deny")) return null;
      return { permissionKey: key, effect: row.effect };
    })
    .filter((x): x is { permissionKey: string; effect: "allow" | "deny" } => x != null);

  return buildEffectivePermissionsByModule({
    userId: input.userId,
    roleKey: resolveRole(input.roleKey),
    rolePermissionKeys: input.rolePermissionKeys,
    userOverrides: overrides,
  });
}
