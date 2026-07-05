import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { RoleRow } from "@/src/types/supabase-tables";

export const ROLES_COLUMNS = "id, key, name, description, is_system, is_active, created_at, updated_at" as const;
export const ROLE_PAGE_ACCESS_COLUMNS = "role_id, page_key, access_level, created_at, updated_at" as const;
export const USER_PAGE_OVERRIDES_COLUMNS = "user_id, page_key, access_level, created_at, updated_at" as const;

export type PageAccessDbBundle = {
  roleKey: string;
  rolePageAccess: Record<string, PageAccessLevel>;
  userPageOverrides: Record<string, PageAccessLevel>;
};

export async function loadRolePageAccess(
  admin: SupabaseClient,
  roleKey: string,
): Promise<Record<string, PageAccessLevel>> {
  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .eq("is_active", true)
    .maybeSingle();
  if (roleErr || !role?.id) return {};

  const { data: rows, error } = await admin
    .from("role_page_access")
    .select("page_key, access_level")
    .eq("role_id", role.id);
  if (error) return {};

  const out: Record<string, PageAccessLevel> = {};
  for (const row of rows ?? []) {
    const level = row.access_level as PageAccessLevel;
    if (level === "write" || level === "read" || level === "none") {
      out[row.page_key] = level;
    }
  }
  return out;
}

export async function loadAllRolePageAccess(admin: SupabaseClient): Promise<Map<string, Record<string, PageAccessLevel>>> {
  const { data: roles, error: rolesErr } = await admin.from("roles").select("id, key").eq("is_active", true);
  if (rolesErr || !roles?.length) return new Map();

  const roleIdToKey = new Map(roles.map((r) => [r.id as string, r.key as string]));
  const { data: rows, error } = await admin.from("role_page_access").select("role_id, page_key, access_level");
  if (error) return new Map();

  const out = new Map<string, Record<string, PageAccessLevel>>();
  for (const row of rows ?? []) {
    const roleKey = roleIdToKey.get(row.role_id as string);
    if (!roleKey) continue;
    const level = row.access_level as PageAccessLevel;
    if (level !== "write" && level !== "read" && level !== "none") continue;
    if (!out.has(roleKey)) out.set(roleKey, {});
    out.get(roleKey)![row.page_key as string] = level;
  }
  return out;
}

export async function loadUserPageOverrides(
  admin: SupabaseClient,
  userId: string,
): Promise<Record<string, PageAccessLevel>> {
  const { data, error } = await admin
    .from("user_page_overrides")
    .select("page_key, access_level")
    .eq("user_id", userId);
  if (error) return {};

  const out: Record<string, PageAccessLevel> = {};
  for (const row of data ?? []) {
    const level = row.access_level as PageAccessLevel;
    if (level === "write" || level === "read" || level === "none") {
      out[row.page_key] = level;
    }
  }
  return out;
}

export async function loadPageAccessDbBundle(
  admin: SupabaseClient,
  userId: string,
  roleKey: string,
): Promise<PageAccessDbBundle> {
  const [rolePageAccess, userPageOverrides] = await Promise.all([
    loadRolePageAccess(admin, roleKey),
    loadUserPageOverrides(admin, userId),
  ]);
  return { roleKey, rolePageAccess, userPageOverrides };
}

export async function listAllRoles(admin: SupabaseClient): Promise<RoleRow[]> {
  const { data, error } = await admin
    .from("roles")
    .select(ROLES_COLUMNS)
    .order("is_system", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as RoleRow[];
}

export async function upsertRolePageAccess(
  admin: SupabaseClient,
  roleId: string,
  pageKey: string,
  accessLevel: PageAccessLevel,
): Promise<void> {
  const { error } = await admin.from("role_page_access").upsert(
    { role_id: roleId, page_key: pageKey, access_level: accessLevel, updated_at: new Date().toISOString() },
    { onConflict: "role_id,page_key" },
  );
  if (error) throw new Error(error.message);
}

export async function upsertUserPageOverride(
  admin: SupabaseClient,
  userId: string,
  pageKey: string,
  accessLevel: PageAccessLevel,
): Promise<void> {
  const { error } = await admin.from("user_page_overrides").upsert(
    { user_id: userId, page_key: pageKey, access_level: accessLevel, updated_at: new Date().toISOString() },
    { onConflict: "user_id,page_key" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteUserPageOverride(admin: SupabaseClient, userId: string, pageKey: string): Promise<void> {
  const { error } = await admin.from("user_page_overrides").delete().eq("user_id", userId).eq("page_key", pageKey);
  if (error) throw new Error(error.message);
}

export async function loadAllUserPageOverrideRows(
  admin: SupabaseClient,
  userIds: string[],
): Promise<{ user_id: string; page_key: string; access_level: PageAccessLevel }[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .from("user_page_overrides")
    .select("user_id, page_key, access_level")
    .in("user_id", userIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as { user_id: string; page_key: string; access_level: PageAccessLevel }[];
}
