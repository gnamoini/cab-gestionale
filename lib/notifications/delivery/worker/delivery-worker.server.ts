import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { loadNotificationRecords } from "@/lib/notifications/infrastructure/notification-repository";
import {
  aggregateRawBatch,
} from "@/lib/notifications/delivery/aggregator/notification-aggregator";
import { ChannelPolicyResolver } from "@/lib/notifications/delivery/resolver/channel-policy-resolver";
import { buildDeliveryPlans } from "@/lib/notifications/delivery/planner/delivery-planner";
import { Dispatcher } from "@/lib/notifications/delivery/dispatcher";
import { registerDeliveryProvider } from "@/lib/notifications/delivery/providers/provider-registry";
import { createWebPushProvider } from "@/lib/notifications/delivery/providers/web-push-provider.server";
import { createCaptureProvider } from "@/lib/notifications/delivery/providers/capture-provider";
import { resolveDeliveryProviderMode } from "@/lib/notifications/delivery/delivery-flags";

export type DeliveryWorkerResult = {
  ok: boolean;
  rawProcessed: number;
  plansExecuted: number;
  error?: string;
  skipped?: string;
};

type RawQueueRow = {
  id: string;
  notification_id: string;
};

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function registerServerProviders(client: SupabaseClient): void {
  registerDeliveryProvider(
    createWebPushProvider(client, async (deviceId) => {
      const { data } = await client
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, company_id")
        .eq("id", deviceId)
        .is("revoked_at", null)
        .maybeSingle();
      return data as { endpoint: string; p256dh: string; auth: string; company_id: string } | null;
    }),
  );
  registerDeliveryProvider(createCaptureProvider(() => client));
}

/** Delivery Worker: claim RAW → Aggregator → Planner → Dispatcher */
export async function runDeliveryWorker(input?: { limit?: number }): Promise<DeliveryWorkerResult> {
  const mode = resolveDeliveryProviderMode();
  if (mode === "noop" && process.env.PWA_PUSH_ENABLED === "false") {
    return { ok: true, rawProcessed: 0, plansExecuted: 0, skipped: "delivery_disabled" };
  }

  const client = createAdminClient();
  registerServerProviders(client);

  const limit = input?.limit ?? 20;
  const { data: claimed, error: claimError } = await client.rpc("cab_claim_delivery_queue_batch", {
    p_job_phase: "raw",
    p_limit: limit,
  });

  if (claimError) {
    return { ok: false, rawProcessed: 0, plansExecuted: 0, error: claimError.message };
  }

  const rows = (claimed ?? []) as RawQueueRow[];
  if (!rows.length) {
    return { ok: true, rawProcessed: 0, plansExecuted: 0 };
  }

  const notificationIds = rows.map((r) => r.notification_id);
  const records = await loadNotificationRecords(client, notificationIds);
  if (!records.length) {
    for (const row of rows) {
      await client.rpc("cab_complete_delivery_queue", {
        p_queue_id: row.id,
        p_success: false,
        p_error: "notification_missing",
      });
    }
    return { ok: true, rawProcessed: rows.length, plansExecuted: 0 };
  }

  const firstType = records[0].type;
  const aggConfig = ChannelPolicyResolver.resolveAggregationMode(firstType);
  const batches = aggregateRawBatch(records, aggConfig);
  const plans = await buildDeliveryPlans(client, batches);

  let plansExecuted = 0;
  for (const plan of plans) {
    const record = records.find((r) => plan.notificationIds.includes(r.id)) ?? records[0];
    await Dispatcher.execute(plan, record);
    plansExecuted += 1;
  }

  for (const row of rows) {
    await client.rpc("cab_complete_delivery_queue", {
      p_queue_id: row.id,
      p_success: true,
      p_error: null,
    });
  }

  await client
    .from("notifications")
    .update({ status: "DELIVERING", status_changed_at: new Date().toISOString() })
    .in("id", notificationIds);

  return { ok: true, rawProcessed: rows.length, plansExecuted };
}
