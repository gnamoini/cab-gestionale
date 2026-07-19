import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";
import { registerDeliveryProvider } from "@/lib/notifications/delivery/providers/provider-registry";

export function createCaptureProvider(getClient: () => SupabaseClient): DeliveryProvider {
  return {
    id: "capture",
    async deliver(ctx) {
      const client = getClient();
      const payload = {
        resolved: ctx.resolved,
        channel: ctx.channel,
        planId: ctx.planId,
        deviceId: ctx.device?.deviceId ?? null,
      };

      const { error } = await client.from("notification_capture_log").insert({
        notification_id: ctx.notification.id,
        delivery_plan_id: ctx.planId,
        channel: ctx.channel,
        resolved_payload: payload,
        provider: "capture",
      });

      if (error) {
        return {
          success: false,
          channel: ctx.channel,
          providerId: "capture",
          error: error.message,
        };
      }

      return {
        success: true,
        channel: ctx.channel,
        providerId: "capture",
      };
    },
  };
}

/** Server singleton set by worker. */
let serverClient: (() => SupabaseClient) | null = null;

export function setCaptureProviderClient(getter: () => SupabaseClient): void {
  serverClient = getter;
  registerDeliveryProvider(createCaptureProvider(getter));
}

export const captureProvider: DeliveryProvider = {
  id: "capture",
  async deliver(ctx) {
    if (!serverClient) {
      return { success: false, channel: ctx.channel, providerId: "capture", error: "no_server_client" };
    }
    return createCaptureProvider(serverClient).deliver(ctx);
  },
};
