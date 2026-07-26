import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
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

export async function loadCompanyUsersWithRoles(
  client: SupabaseClient,
  companyId: string,
): Promise<CompanyUserProfile[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, role_key, company_id")
    .eq("company_id", companyId);

  if (error) {
    console.warn("[notifications] loadCompanyUsersWithRoles:", error.message);
    return [];
  }
  return (data ?? []) as CompanyUserProfile[];
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
    excludeActor?: boolean;
  },
): Promise<string[]> {
  const entry = getNotificationRegistryEntry(input.notificationEventId);
  if (!entry) return [];

  const snapshot = await loadCompanyRbacSnapshot(client, input.companyId);
  return resolveNotificationRecipientsFromSnapshot({
    snapshot,
    entry,
    actorId: input.actorId,
    excludeActor: input.excludeActor,
  });
}
