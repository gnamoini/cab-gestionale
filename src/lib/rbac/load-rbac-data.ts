import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { RoleRow } from "@/src/types/supabase-tables";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { normalizeRoleKey } from "@/src/lib/rbac/normalize-role-key";

export const ROLES_COLUMNS = "id, key, name, description, is_system, is_active, created_at, updated_at" as const;
export const ROLE_PAGE_ACCESS_COLUMNS = "role_id, page_key, access_level, created_at, updated_at" as const;
export const USER_PAGE_OVERRIDES_COLUMNS = "user_id, page_key, access_level, created_at, updated_at" as const;

export type PageAccessDbBundle = {
  roleKey: string;
  rolePageAccess: Record<string, PageAccessLevel>;
  userPageOverrides: Record<string, PageAccessLevel>;
};

/** Env senza tabelle pagina (migration non applicata o schema cache PostgREST stale). */
export function isRbacPageTableUnavailableError(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    /user_page_overrides|role_page_access|rbac_page_module_expansion/i.test(message) &&
    /schema cache|does not exist|PGRST205|42P01/i.test(message)
  );
}

function logRbacPageReadError(scope: string, error: { message?: string }): void {
  if (isRbacPageTableUnavailableError(error.message)) return;
  console.warn(`[rbac] ${scope}:`, error.message ?? "unknown");
}

export function mergeRolePageAccessWithSeed(
  roleKey: string,
  rolePageAccess: Record<string, PageAccessLevel>,
): Record<string, PageAccessLevel> {
  return { ...seedPageAccessForRole(roleKey), ...rolePageAccess };
}

export async function loadRolePageAccess(
  admin: SupabaseClient,
  roleKey: string,
): Promise<Record<string, PageAccessLevel>> {
  const normalizedKey = normalizeRoleKey(roleKey);
  const out: Record<string, PageAccessLevel> = {};

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("key", normalizedKey)
    .eq("is_active", true)
    .maybeSingle();
  if (roleErr) {
    logRbacPageReadError("loadRolePageAccess.roles", roleErr);
  } else if (role?.id) {
    const { data: rows, error } = await admin
      .from("role_page_access")
      .select("page_key, access_level")
      .eq("role_id", role.id);
    if (error) {
      logRbacPageReadError("loadRolePageAccess", error);
    } else {
      for (const row of rows ?? []) {
        const level = row.access_level as PageAccessLevel;
        if (level === "write" || level === "read" || level === "none") {
          out[row.page_key] = level;
        }
      }
    }
  }

  return mergeRolePageAccessWithSeed(normalizedKey, out);
}

export async function loadAllRolePageAccess(admin: SupabaseClient): Promise<Map<string, Record<string, PageAccessLevel>>> {
  const { data: roles, error: rolesErr } = await admin.from("roles").select("id, key").eq("is_active", true);
  if (rolesErr || !roles?.length) return new Map();

  const roleIdToKey = new Map(roles.map((r) => [r.id as string, r.key as string]));
  const { data: rows, error } = await admin.from("role_page_access").select("role_id, page_key, access_level");
  if (error) {
    logRbacPageReadError("loadAllRolePageAccess", error);
    return new Map();
  }

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
  try {
    const { data, error } = await admin
      .from("user_page_overrides")
      .select("page_key, access_level")
      .eq("user_id", userId);
    if (error) {
      logRbacPageReadError("loadUserPageOverrides", error);
      return {};
    }

    const out: Record<string, PageAccessLevel> = {};
    for (const row of data ?? []) {
      const level = row.access_level as PageAccessLevel;
      if (level === "write" || level === "read" || level === "none") {
        out[row.page_key] = level;
      }
    }
    return out;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isRbacPageTableUnavailableError(message)) {
      console.warn("[rbac] loadUserPageOverrides:", message);
    }
    return {};
  }
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
  try {
    const { data, error } = await admin
      .from("user_page_overrides")
      .select("user_id, page_key, access_level")
      .in("user_id", userIds);
    if (error) {
      if (isRbacPageTableUnavailableError(error.message)) return [];
      throw new Error(error.message);
    }
    return (data ?? []) as { user_id: string; page_key: string; access_level: PageAccessLevel }[];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isRbacPageTableUnavailableError(message)) return [];
    throw e;
  }
}
