import type { DeliveryResult } from "@/lib/notifications/delivery/providers/delivery-provider";
import type { DeliveryPlan } from "@/lib/notifications/delivery/planner/delivery-plan";
import type { NotificationContext } from "@/lib/notifications/delivery/notification-context";
import { getDeliveryProvider } from "@/lib/notifications/delivery/providers/provider-registry";
import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import { DEFAULT_DEVICE_CAPABILITIES } from "@/lib/notifications/delivery/notification-context";
import { PresenceResolver } from "@/lib/notifications/delivery/resolver/presence-resolver";

export type DispatchResult = {
  planId: string;
  results: DeliveryResult[];
};

function buildContext(
  plan: DeliveryPlan,
  record: NotificationRecord,
  item: DeliveryPlan["items"][number],
): NotificationContext {
  const device = item.deviceId
    ? { deviceId: item.deviceId, capabilities: DEFAULT_DEVICE_CAPABILITIES, presence: "OFFLINE" as const }
    : undefined;

  return {
    notification: record,
    resolved: plan.resolved,
    recipient: { id: plan.recipientId, role: null },
    company: { id: "" },
    device,
    locale: "it",
    presence: "OFFLINE",
    preferences: PresenceResolver.defaultPreferences(),
    capabilities: device?.capabilities ?? DEFAULT_DEVICE_CAPABILITIES,
    planId: plan.planId,
    channel: item.channel,
  };
}

/** Executes a resolved DeliveryPlan — no policy decisions. */
export async function executeDeliveryPlan(
  plan: DeliveryPlan,
  record: NotificationRecord,
): Promise<DispatchResult> {
  const results: DeliveryResult[] = [];
  const start = Date.now();

  for (const item of plan.items) {
    const provider = getDeliveryProvider(item.providerId);
    if (!provider) {
      results.push({
        success: false,
        channel: item.channel,
        providerId: item.providerId,
        error: "provider_not_found",
        dispatchMs: Date.now() - start,
      });
      continue;
    }

    const ctx = buildContext(plan, record, item);
    const t0 = Date.now();
    try {
      const result = await provider.deliver(ctx);
      results.push({ ...result, dispatchMs: Date.now() - start, providerMs: Date.now() - t0 });
    } catch (e) {
      results.push({
        success: false,
        channel: item.channel,
        providerId: item.providerId,
        error: e instanceof Error ? e.message : "dispatch_error",
        dispatchMs: Date.now() - start,
        providerMs: Date.now() - t0,
      });
    }
  }

  return { planId: plan.planId, results };
}

export const Dispatcher = { execute: executeDeliveryPlan };
