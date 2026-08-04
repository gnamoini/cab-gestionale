import { resolveCanonicalRole } from "@/lib/rbac";
import {
  getNotificationRegistryEntry,
  type NotificationEventDefinition,
} from "@/lib/notifications/notification-event-catalog";
import { roleKeyToRecipientTier } from "@/lib/notifications/registry/role-recipient-tier";
import { mergeRolePageAccessWithSeed } from "@/src/lib/rbac/load-rbac-data";
import {
  canReadPage,
  canWritePage,
  resolvePageAccess,
  type ResolvedPageAccess,
} from "@/src/lib/rbac/resolve-page-access";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

export type CompanyUserProfile = {
  id: string;
  role_key: string | null;
  company_id: string;
};

export type CompanyRbacSnapshot = {
  users: CompanyUserProfile[];
  rolePageAccessByRole: Map<string, Record<string, PageAccessLevel>>;
  userOverridesByUserId: Map<string, Record<string, PageAccessLevel>>;
};

function resolveUserPageAccess(
  user: CompanyUserProfile,
  snapshot: CompanyRbacSnapshot,
): ResolvedPageAccess {
  const roleKey = resolveCanonicalRole(user.role_key);
  const seededRoleAccess = mergeRolePageAccessWithSeed(
    roleKey,
    snapshot.rolePageAccessByRole.get(roleKey) ?? {},
  );
  const userOverrides = snapshot.userOverridesByUserId.get(user.id) ?? {};
  return resolvePageAccess({
    userId: user.id,
    roleKey,
    rolePageAccess: seededRoleAccess,
    userPageOverrides: userOverrides,
  });
}

function userPassesPageAccess(
  resolved: ResolvedPageAccess,
  entry: NotificationEventDefinition,
): boolean {
  if (entry.requiredAccess === "write") {
    return canWritePage(resolved, entry.pageKey);
  }
  return canReadPage(resolved, entry.pageKey) || canWritePage(resolved, entry.pageKey);
}

export function resolveNotificationRecipientsFromSnapshot(input: {
  snapshot: CompanyRbacSnapshot;
  entry: NotificationEventDefinition;
  actorId?: string | null;
  notifyAuthor?: boolean;
}): string[] {
  const { snapshot, entry, actorId, notifyAuthor = entry.notifyAuthor } = input;
  const recipientIds: string[] = [];

  for (const user of snapshot.users) {
    if (!notifyAuthor && actorId && user.id === actorId) continue;

    const tier = roleKeyToRecipientTier(user.role_key);
    if (!tier || !entry.recipients[tier]) continue;

    const resolved = resolveUserPageAccess(user, snapshot);
    if (!userPassesPageAccess(resolved, entry)) continue;

    recipientIds.push(user.id);
  }

  return recipientIds;
}

export function resolveNotificationRecipientsForEvent(
  snapshot: CompanyRbacSnapshot,
  notificationEventId: string,
  options?: { actorId?: string | null; notifyAuthor?: boolean },
): string[] {
  const entry = getNotificationRegistryEntry(notificationEventId);
  if (!entry) return [];
  return resolveNotificationRecipientsFromSnapshot({
    snapshot,
    entry,
    actorId: options?.actorId,
    notifyAuthor: options?.notifyAuthor,
  });
}
