import type { DeliveryChannel, PresenceStatus } from "@/lib/notifications/application/policies/notification-policy-config";
import type { NotificationType } from "@/lib/notifications/notification-types";
import { getNotificationPolicy } from "@/lib/notifications/application/policies/notification-policies";
import type { UserDeliveryContext } from "@/lib/notifications/delivery/notification-context";
import type { EnterpriseNotificationPriority } from "@/lib/notifications/domain/notification-priority";
import { isNotificationAggregationEnabled } from "@/lib/notifications/delivery/delivery-flags";

export type ChannelResolution = {
  channels: DeliveryChannel[];
  scheduledAt: string;
};

type DbOverride = {
  channels_enabled?: Partial<Record<DeliveryChannel, boolean>>;
  aggregation_override?: { mode?: string };
};

function isQuietHours(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const startM = sh * 60 + (sm || 0);
  const endM = eh * 60 + (em || 0);
  if (startM <= endM) return mins >= startM && mins < endM;
  return mins >= startM || mins < endM;
}

function channelsForPresence(
  presence: PresenceStatus,
  policyChannels: DeliveryChannel[],
  presencePolicy: Partial<Record<PresenceStatus, DeliveryChannel[]>>,
): DeliveryChannel[] {
  const fromPresence = presencePolicy[presence];
  if (fromPresence?.length) {
    return fromPresence.filter((c) => policyChannels.includes(c));
  }
  return policyChannels;
}

export function resolveChannels(
  notificationType: NotificationType,
  ctx: UserDeliveryContext,
  priority: EnterpriseNotificationPriority,
  dbOverride?: DbOverride | null,
  now = new Date(),
): ChannelResolution {
  const policy = getNotificationPolicy(notificationType);
  let channels = channelsForPresence(ctx.presence, policy.channels, policy.presencePolicy);

  const enabled = dbOverride?.channels_enabled;
  if (enabled) {
    channels = channels.filter((c) => enabled[c] !== false);
  }

  const cat = notificationType.split("_")[0];
  if (ctx.preferences.categories[cat] === false) {
    channels = channels.filter((c) => c !== "push" && c !== "email" && c !== "sms");
  }

  let scheduledAt = now.toISOString();
  if (
    priority !== "CRITICAL" &&
    isQuietHours(now, ctx.preferences.quietHoursStart, ctx.preferences.quietHoursEnd)
  ) {
    channels = channels.filter((c) => c !== "push");
  }

  return { channels, scheduledAt };
}

export function resolveAggregationMode(
  notificationType: NotificationType,
  dbOverride?: DbOverride | null,
): ReturnType<typeof getNotificationPolicy>["aggregation"] {
  if (!isNotificationAggregationEnabled()) return { mode: "none" };
  const policy = getNotificationPolicy(notificationType);
  const override = dbOverride?.aggregation_override?.mode;
  if (override === "none" || override === "bundle_push" || override === "bundle_all") {
    return { ...policy.aggregation, mode: override };
  }
  return policy.aggregation;
}

export const ChannelPolicyResolver = { resolveChannels, resolveAggregationMode };
