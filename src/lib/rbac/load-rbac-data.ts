import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionEffect } from "@/src/lib/rbac/resolve-user-permissions";
import type { PermissionRow, RoleRow, UserPermissionRow } from "@/src/types/supabase-tables";

export const ROLES_COLUMNS = "id, key, name, description, is_system, is_active, created_at, updated_at" as const;
export const PERMISSIONS_COLUMNS =
  "id, key, module, action, label, description, is_system, created_at, updated_at" as const;
export const USER_PERMISSIONS_COLUMNS = "user_id, permission_id, effect, created_at, updated_at" as const;

export type RbacDbBundle = {
  roleKey: string;
  rolePermissionKeys: string[];
  userOverrides: { permissionKey: string; effect: PermissionEffect }[];
};

export async function loadRolePermissionKeys(
  admin: SupabaseClient,
  roleKey: string,
): Promise<string[]> {
  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .eq("is_active", true)
    .maybeSingle();
  if (roleErr || !role?.id) return [];

  const { data: rows, error } = await admin
    .from("role_permissions")
    .select("permission_id, permissions(key)")
    .eq("role_id", role.id)
    .eq("effect", "allow");
  if (error) return [];

  const keys: string[] = [];
  for (const row of rows ?? []) {
    const perm = row.permissions as { key?: string } | null;
    if (perm?.key) keys.push(perm.key);
  }
  return keys;
}

export async function loadUserPermissionOverrides(
  admin: SupabaseClient,
  userId: string,
): Promise<{ permissionKey: string; effect: PermissionEffect }[]> {
  const { data, error } = await admin
    .from("user_permissions")
    .select("effect, permissions(key)")
    .eq("user_id", userId);
  if (error) return [];

  const out: { permissionKey: string; effect: PermissionEffect }[] = [];
  for (const row of data ?? []) {
    const perm = row.permissions as { key?: string } | null;
    if (perm?.key && (row.effect === "allow" || row.effect === "deny")) {
      out.push({ permissionKey: perm.key, effect: row.effect });
    }
  }
  return out;
}

export async function loadRbacDbBundle(admin: SupabaseClient, userId: string, roleKey: string): Promise<RbacDbBundle> {
  const [rolePermissionKeys, userOverrides] = await Promise.all([
    loadRolePermissionKeys(admin, roleKey),
    loadUserPermissionOverrides(admin, userId),
  ]);
  return { roleKey, rolePermissionKeys, userOverrides };
}

export async function listAllRoles(admin: SupabaseClient): Promise<RoleRow[]> {
  const { data, error } = await admin.from("roles").select(ROLES_COLUMNS).order("is_system", { ascending: false }).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as RoleRow[];
}

export async function listAllPermissions(admin: SupabaseClient): Promise<PermissionRow[]> {
  const { data, error } = await admin.from("permissions").select(PERMISSIONS_COLUMNS).order("module").order("action");
  if (error) throw new Error(error.message);
  return (data ?? []) as PermissionRow[];
}

export async function loadAllUserPermissionRows(admin: SupabaseClient, userIds: string[]): Promise<UserPermissionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .from("user_permissions")
    .select(`${USER_PERMISSIONS_COLUMNS}, permissions(key, module, action)`)
    .in("user_id", userIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as UserPermissionRow[];
}
