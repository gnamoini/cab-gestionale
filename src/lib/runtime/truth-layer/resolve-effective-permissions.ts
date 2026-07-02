import { resolveRole } from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
import {
  buildEffectivePermissionsByModule,
  buildResolvedPermissions,
} from "@/src/lib/permissions/effective-permissions";
import { resolvePilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import type { UserPermissionOverrideInput } from "@/src/lib/rbac/resolve-user-permissions";
import type {
  EffectivePermissionsInput,
  EffectivePermissionsSnapshot,
} from "@/src/lib/runtime/truth-layer/types";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export function rbacContextFromPilotDb(
  dbEnabled: boolean,
  resolved?: import("@/src/lib/rbac/resolve-user-permissions").ResolvedPermissions,
): RbacEvaluationContext {
  return { operatorGlobalSettingsDbEnabled: dbEnabled, resolved };
}

function userOverridesFromRows(rows: UserPermissionRow[] | undefined): UserPermissionOverrideInput[] {
  const out: UserPermissionOverrideInput[] = [];
  for (const row of rows ?? []) {
    const key = row.permissions?.key;
    if (key && (row.effect === "allow" || row.effect === "deny")) {
      out.push({ permissionKey: key, effect: row.effect });
    }
  }
  return out;
}

/** Canonico: ruolo + role_permissions + user_permissions + pilot DB → snapshot unico. */
export function resolveEffectivePermissions(input: EffectivePermissionsInput): EffectivePermissionsSnapshot {
  const pilot = resolvePilotSettingsState(input.pilotDbEnabled);
  const roleKey = resolveRole(input.roleKey ?? input.ruolo);
  const userId = input.userId ?? "";
  const userOverrides = userOverridesFromRows(input.permissionRows);
  const resolved = buildResolvedPermissions({
    userId,
    roleKey,
    rolePermissionKeys: input.rolePermissionKeys,
    userOverrides,
  });
  const modules = buildEffectivePermissionsByModule({
    userId,
    roleKey,
    rolePermissionKeys: input.rolePermissionKeys,
    userOverrides,
  });

  return {
    userId: input.userId,
    role: roleKey,
    roleKey,
    pilot,
    rbacContext: rbacContextFromPilotDb(pilot.dbEnabled, resolved),
    modules,
    resolved,
    rolePermissionKeys: input.rolePermissionKeys,
  };
}
