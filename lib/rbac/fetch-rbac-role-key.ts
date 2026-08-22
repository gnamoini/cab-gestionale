import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/rbac";

type UserRoleJoinRow = {
  roles: { key: string; is_active: boolean } | { key: string; is_active: boolean }[] | null;
};

/** Allineato a `rbac_role_for_user`: user_roles → profiles.role_key → guest. */
export async function fetchRbacRoleKeyForUser(
  sb: SupabaseClient,
  userId: string,
): Promise<string> {
  const uid = userId.trim();
  if (!uid) return "guest";

  const { data: urRow } = await sb
    .from("user_roles")
    .select("roles(key, is_active)")
    .eq("user_id", uid)
    .maybeSingle();

  const joined = (urRow as UserRoleJoinRow | null)?.roles;
  const role = Array.isArray(joined) ? joined[0] : joined;
  if (role?.is_active && typeof role.key === "string" && role.key.trim()) {
    return resolveRole(role.key);
  }

  const { data: prof } = await sb.from("profiles").select("role_key").eq("id", uid).maybeSingle();
  const profileKey = typeof prof?.role_key === "string" ? prof.role_key.trim() : "";
  if (profileKey) return resolveRole(profileKey);

  return "guest";
}
