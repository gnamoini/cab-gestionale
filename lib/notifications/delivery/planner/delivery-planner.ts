import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryPlan, DeliveryPlanItem } from "@/lib/notifications/delivery/planner/delivery-plan";
import { createPlanId } from "@/lib/notifications/delivery/planner/delivery-plan";
import type { RawJobBatch } from "@/lib/notifications/delivery/aggregator/notification-aggregator";
import { resolveBundledNotification } from "@/lib/notifications/delivery/aggregator/notification-aggregator";
import { buildResolvedNotification } from "@/lib/notifications/delivery/resolver/resolved-notification-builder";
import { ChannelPolicyResolver } from "@/lib/notifications/delivery/resolver/channel-policy-resolver";
import { PresenceResolver } from "@/lib/notifications/delivery/resolver/presence-resolver";
import { getNotificationPolicy } from "@/lib/notifications/application/policies/notification-policies";
import { toEnterprisePriority } from "@/lib/notifications/domain/notification-priority";
import { resolveDeliveryProviderMode } from "@/lib/notifications/delivery/delivery-flags";
import type { DeliveryChannel } from "@/lib/notifications/application/policies/notification-policy-config";

type RecipientProfile = {
  id: string;
  company_id: string;
  role_key: string | null;
};

function providerForChannel(channel: DeliveryChannel): string {
  const mode = resolveDeliveryProviderMode();
  if (channel === "push") {
    if (mode === "capture") return "capture";
    if (mode === "noop") return "noop";
    return "webpush";
  }
  if (channel === "realtime" || channel === "sidebar" || channel === "badge") return "realtime";
  if (channel === "desktop") return "desktop";
  return "noop";
}

function planItemsForChannels(
  channels: DeliveryChannel[],
  deviceIds: string[],
): DeliveryPlanItem[] {
  const items: DeliveryPlanItem[] = [];
  for (const channel of channels) {
    if (channel === "push" && deviceIds.length) {
      for (const deviceId of deviceIds) {
        items.push({ channel, deviceId, providerId: providerForChannel(channel) });
      }
    } else if (channel !== "badge") {
      items.push({ channel, providerId: providerForChannel(channel) });
    }
  }
  return items;
}

export async function buildDeliveryPlans(
  client: SupabaseClient,
  batches: RawJobBatch[],
): Promise<DeliveryPlan[]> {
  const plans: DeliveryPlan[] = [];

  for (const batch of batches) {
    const record = batch.records[0];
    if (!record) continue;

    const policy = getNotificationPolicy(record.type);
    const priority = toEnterprisePriority(record.priority);
    const resolved = batch.bundled
      ? resolveBundledNotification(batch.records)
      : buildResolvedNotification(record);

    const recipientIds = await resolveRecipientIds(client, record);
    for (const recipientId of recipientIds) {
      const { data: profile } = await client
        .from("profiles")
        .select("id, company_id, role_key")
        .eq("id", recipientId)
        .maybeSingle();

      if (!profile) continue;
      const prof = profile as RecipientProfile;

      const { data: subs } = await client
        .from("push_subscriptions")
        .select(
          "id, endpoint, user_agent, presence_status, presence_updated_at, supports_actions, supports_badge, supports_image, supports_require_interaction, supports_vibrate",
        )
        .eq("user_id", recipientId)
        .is("revoked_at", null);

      const ctx = PresenceResolver.buildUserDeliveryContext(
        prof,
        (subs ?? []) as Parameters<typeof PresenceResolver.buildUserDeliveryContext>[1],
        PresenceResolver.defaultPreferences(),
      );

      const { channels, scheduledAt } = ChannelPolicyResolver.resolveChannels(
        record.type,
        ctx,
        policy.priority,
      );

      const deviceIds = ctx.devices.map((d) => d.deviceId);
      const items = planItemsForChannels(channels, deviceIds);
      if (!items.length) continue;

      plans.push({
        planId: createPlanId(),
        notificationIds: batch.notificationIds,
        recipientId,
        channels,
        priority,
        scheduledAt,
        aggregationKey: batch.aggregationKey ?? undefined,
        resolved,
        items,
      });
    }
  }

  return plans;
}

async function resolveRecipientIds(
  client: SupabaseClient,
  record: { scopeType: string; scopeValue: string | null },
): Promise<string[]> {
  if (record.scopeType === "user" && record.scopeValue) {
    return [record.scopeValue];
  }

  if (record.scopeType === "role" && record.scopeValue) {
    const { data } = await client.from("profiles").select("id").eq("role_key", record.scopeValue);
    return (data ?? []).map((r) => String((r as { id: string }).id));
  }

  const staffRoles = ["admin", "manager", "operatore", "addetto_amministrativo"];
  const { data } = await client.from("profiles").select("id").in("role_key", staffRoles);
  return (data ?? []).map((r) => String((r as { id: string }).id));
}
