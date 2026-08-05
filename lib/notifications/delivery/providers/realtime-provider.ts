import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";

/** Marks realtime delivery — Supabase INSERT already triggers client invalidation. */
export const realtimeProvider: DeliveryProvider = {
  id: "realtime",
  channel: "realtime",
  async deliver(ctx) {
    return {
      success: true,
      channel: ctx.channel,
      providerId: "realtime",
      renderMs: 0,
      providerMs: 0,
    };
  },
};
