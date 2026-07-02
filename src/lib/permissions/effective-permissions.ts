import type { Capability } from "@/lib/rbac";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import {
  resolveUserPermissions,
  type ResolvedPermissions,
  type UserPermissionOverrideInput,
} from "@/src/lib/rbac/resolve-user-permissions";
import { resolveRole } from "@/lib/auth/rbac";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export type EffectiveModulePermission = {
  canRead: boolean;
  canWrite: boolean;
};

export type BuildEffectivePermissionsInput = {
  userId: string;
  roleKey: string | null | undefined;
  rolePermissionKeys?: string[];
  userOverrides?: UserPermissionOverrideInput[];
  permissionRows?: UserPermissionRow[];
};

function overridesFromRows(rows: UserPermissionRow[] | undefined): UserPermissionOverrideInput[] {
  const out: UserPermissionOverrideInput[] = [];
  for (const row of rows ?? []) {
    const key = row.permissions?.key;
    if (key && (row.effect === "allow" || row.effect === "deny")) {
      out.push({ permissionKey: key, effect: row.effect });
    }
  }
  return out;
}

function mergeUserOverrides(input: BuildEffectivePermissionsInput): UserPermissionOverrideInput[] {
  return [...(input.userOverrides ?? []), ...overridesFromRows(input.permissionRows)];
}

/** Build resolved permissions from DB rows. Fail-closed if rolePermissionKeys empty. */
export function buildEffectivePermissionsByModule(
  input: BuildEffectivePermissionsInput,
): Record<GestionalePermissionModule, EffectiveModulePermission> {
  const roleKey = resolveRole(input.roleKey);
  const resolved = resolveUserPermissions({
    userId: input.userId,
    roleKey,
    rolePermissionKeys: input.rolePermissionKeys ?? [],
    userOverrides: mergeUserOverrides(input),
  });
  return resolved.modules;
}

export function buildResolvedPermissions(input: BuildEffectivePermissionsInput): ResolvedPermissions {
  const roleKey = resolveRole(input.roleKey);
  return resolveUserPermissions({
    userId: input.userId,
    roleKey,
    rolePermissionKeys: input.rolePermissionKeys ?? [],
    userOverrides: mergeUserOverrides(input),
  });
}

export function capabilitiesFromResolved(resolved: ResolvedPermissions): Record<Capability, boolean> {
  return resolved.capabilities;
}
