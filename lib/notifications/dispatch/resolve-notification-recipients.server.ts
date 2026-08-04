import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCanonicalRole } from "@/lib/rbac";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import {
  loadAllRolePageAccess,
  loadAllUserPageOverrideRows,
} from "@/src/lib/rbac/load-rbac-data";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import {
  resolveNotificationRecipientsFromSnapshot,
  type CompanyRbacSnapshot,
  type CompanyUserProfile,
} from "@/lib/notifications/dispatch/resolve-notification-recipients";

export type { CompanyRbacSnapshot, CompanyUserProfile } from "@/lib/notifications/dispatch/resolve-notification-recipients";
export { resolveNotificationRecipientsFromSnapshot } from "@/lib/notifications/dispatch/resolve-notification-recipients";

type UserRoleJoinRow = {
  user_id: string;
  roles: { key: string; is_active: boolean } | { key: string; is_active: boolean }[] | null;
};

async function loadEffectiveRoleKeysByUserId(
  client: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;

  const { data: urRows, error } = await client
    .from("user_roles")
    .select("user_id, roles(key, is_active)")
    .in("user_id", userIds);

  if (error) {
    throw new Error(`[notifications] load user_roles failed: ${error.message}`);
  }

  for (const row of urRows ?? []) {
    const uid = String((row as UserRoleJoinRow).user_id);
    const joined = (row as UserRoleJoinRow).roles;
    const role = Array.isArray(joined) ? joined[0] : joined;
    if (role?.is_active && typeof role.key === "string" && role.key.trim()) {
      map.set(uid, resolveCanonicalRole(role.key));
    }
  }

  return map;
}

export async function loadCompanyUsersWithRoles(
  client: SupabaseClient,
  companyId: string,
): Promise<CompanyUserProfile[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, role_key, company_id")
    .eq("company_id", companyId);

  if (error) {
    throw new Error(`[notifications] loadCompanyUsersWithRoles failed: ${error.message}`);
  }

  const rows = (data ?? []) as CompanyUserProfile[];
  const userIds = rows.map((u) => u.id);
  const effectiveRoles = await loadEffectiveRoleKeysByUserId(client, userIds);

  return rows.map((user) => ({
    ...user,
    role_key: effectiveRoles.get(user.id) ?? resolveCanonicalRole(user.role_key),
  }));
}

export async function loadCompanyRbacSnapshot(
  client: SupabaseClient,
  companyId: string,
): Promise<CompanyRbacSnapshot> {
  const users = await loadCompanyUsersWithRoles(client, companyId);
  const userIds = users.map((u) => u.id);

  const [rolePageAccessByRole, overrideRows] = await Promise.all([
    loadAllRolePageAccess(client),
    loadAllUserPageOverrideRows(client, userIds),
  ]);

  const userOverridesByUserId = new Map<string, Record<string, PageAccessLevel>>();
  for (const row of overrideRows) {
    if (!userOverridesByUserId.has(row.user_id)) userOverridesByUserId.set(row.user_id, {});
    userOverridesByUserId.get(row.user_id)![row.page_key] = row.access_level;
  }

  return { users, rolePageAccessByRole, userOverridesByUserId };
}

export async function resolveNotificationRecipients(
  client: SupabaseClient,
  input: {
    companyId: string;
    notificationEventId: string;
    actorId?: string | null;
    notifyAuthor?: boolean;
    /** @deprecated use notifyAuthor */
    excludeActor?: boolean;
  },
): Promise<string[]> {
  const entry = getNotificationRegistryEntry(input.notificationEventId);
  if (!entry) return [];

  const notifyAuthor =
    input.notifyAuthor ??
    (input.excludeActor !== undefined ? !input.excludeActor : undefined);

  const snapshot = await loadCompanyRbacSnapshot(client, input.companyId);
  return resolveNotificationRecipientsFromSnapshot({
    snapshot,
    entry,
    actorId: input.actorId,
    notifyAuthor,
  });
}
