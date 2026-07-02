/**
 * Test fixtures: simulate DB role_permissions from seed (NOT runtime).
 */
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export function buildTestSnapshot(input: {
  userId: string;
  roleKey: string;
  userOverrides?: { permissionKey: string; effect: "allow" | "deny" }[];
}): EffectivePermissionsSnapshot {
  const permissionRows: UserPermissionRow[] = (input.userOverrides ?? []).map((o, i) => ({
    user_id: input.userId,
    permission_id: `perm-${i}`,
    effect: o.effect,
    permissions: { key: o.permissionKey, module: null, action: null },
  }));

  return resolveEffectivePermissions({
    userId: input.userId,
    roleKey: input.roleKey,
    rolePermissionKeys: rbacSeedPermissionKeysForRole(input.roleKey),
    permissionRows,
    pilotDbEnabled: false,
  });
}
