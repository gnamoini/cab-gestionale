import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionPayload } from "@/lib/pwa/push-types";
import { writePwaPushDeviceState } from "@/lib/pwa/push-device-state";

export async function upsertPushSubscriptionRpc(
  client: SupabaseClient,
  subscription: PushSubscriptionPayload,
  userAgent?: string,
): Promise<{ ok: boolean; id: string | null }> {
  const { data, error } = await client.rpc("cab_upsert_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
    p_auth: subscription.keys.auth,
    p_user_agent: userAgent ?? null,
  });
  if (error) {
    console.warn("[push] upsert subscription failed:", error.message);
    return { ok: false, id: null };
  }
  return { ok: true, id: typeof data === "string" ? data : null };
}

export async function revokePushSubscriptionRpc(
  client: SupabaseClient,
  endpoint: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("cab_revoke_push_subscription", {
    p_endpoint: endpoint,
  });
  if (error) {
    console.warn("[push] revoke subscription failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function revokeCurrentPushSubscription(
  client: SupabaseClient,
  registration: ServiceWorkerRegistration | null,
): Promise<boolean> {
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return false;
  const endpoint = sub.endpoint;
  const ok = await revokePushSubscriptionRpc(client, endpoint);
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  writePwaPushDeviceState({ enabled: false, lastSubscriptionSync: Date.now() });
  return ok;
}
