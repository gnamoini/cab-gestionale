import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import {
  loadEventPreferencesForUsers,
  toPreferenceOverrideMap,
} from "@/lib/notifications/preferences/load-event-preferences.server";
import { isNotificationEventEnabled } from "@/lib/notifications/preferences/notification-preference-resolver";
import {
  loadCompanyRbacSnapshot,
  resolveNotificationRecipientsFromSnapshot,
} from "@/lib/notifications/dispatch/resolve-notification-recipients.server";
import { toLegacyPriority } from "@/lib/notifications/domain/notification-priority";
import { emptySnapshot } from "@/lib/notifications/domain/notification-snapshot";

export type DispatchNotificationEventInput = {
  notificationEventId: string;
  companyId: string;
  actorId?: string | null;
  excludeActor?: boolean;
  dispatchIdempotencyKey: string;
  buildCommand: (recipientId: string) => PublishNotificationCommand;
};

export type DispatchNotificationEventResult = {
  created: number;
  skipped: number;
  recipientCount: number;
  duplicate: boolean;
};

function createNotificationAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type BulkDispatchItem = {
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  dedup_key: string;
  idempotency_key: string;
  translation_key: string;
  translation_params: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  source_domain_event: string | null;
  priority: string | null;
};

function commandToBulkItem(cmd: PublishNotificationCommand, recipientId: string): BulkDispatchItem {
  return {
    recipient_user_id: recipientId,
    type: cmd.notificationType,
    title: cmd.title,
    body: cmd.body,
    href: cmd.deepLink ?? null,
    entity_type: cmd.entityType ?? null,
    entity_id: cmd.entityId ?? null,
    dedup_key: cmd.dedupKey,
    idempotency_key: cmd.idempotencyKey,
    translation_key: cmd.translationKey,
    translation_params: cmd.translationParams ?? {},
    snapshot: (cmd.snapshot ?? emptySnapshot()) as Record<string, unknown>,
    source_domain_event: cmd.sourceDomainEvent ?? null,
    priority: cmd.priority ? toLegacyPriority(cmd.priority) : null,
  };
}

export async function dispatchNotificationEvent(
  input: DispatchNotificationEventInput,
  client?: SupabaseClient,
): Promise<DispatchNotificationEventResult> {
  const admin = client ?? createNotificationAdminClient();
  const entry = getNotificationRegistryEntry(input.notificationEventId);
  if (!entry) {
    return { created: 0, skipped: 0, recipientCount: 0, duplicate: false };
  }

  const excludeActor = input.excludeActor ?? entry.excludeActorDefault;
  const snapshot = await loadCompanyRbacSnapshot(admin, input.companyId);
  const recipientIds = resolveNotificationRecipientsFromSnapshot({
    snapshot,
    entry,
    actorId: input.actorId,
    excludeActor,
  });

  if (!recipientIds.length) {
    return { created: 0, skipped: 0, recipientCount: 0, duplicate: false };
  }

  const prefRows = await loadEventPreferencesForUsers(admin, {
    companyId: input.companyId,
    userIds: recipientIds,
    notificationEventIds: [input.notificationEventId],
  });
  const overrides = toPreferenceOverrideMap(prefRows);

  const eligibleRecipients = recipientIds.filter((userId) =>
    isNotificationEventEnabled({
      notificationEventId: input.notificationEventId,
      userId,
      companyId: input.companyId,
      entry,
      overrides,
    }),
  );

  const skipped = recipientIds.length - eligibleRecipients.length;
  if (!eligibleRecipients.length) {
    return { created: 0, skipped, recipientCount: recipientIds.length, duplicate: false };
  }

  const items = eligibleRecipients.map((recipientId) => {
    const cmd = input.buildCommand(recipientId);
    return commandToBulkItem(cmd, recipientId);
  });

  const { data, error } = await admin.rpc("cab_dispatch_notifications_bulk", {
    p_company_id: input.companyId,
    p_dispatch_notification_event_id: input.notificationEventId,
    p_dispatch_idempotency_key: input.dispatchIdempotencyKey,
    p_actor_id: input.actorId ?? null,
    p_items: items,
  });

  if (error) {
    console.warn("[notifications] dispatchNotificationEvent failed:", error.message);
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { created_count?: number; duplicate?: boolean }
    | null;

  return {
    created: row?.created_count ?? 0,
    skipped,
    recipientCount: recipientIds.length,
    duplicate: Boolean(row?.duplicate),
  };
}
