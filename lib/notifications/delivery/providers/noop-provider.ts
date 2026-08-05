import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";

export const noopProvider: DeliveryProvider = {
  id: "noop",
  channel: "noop",
  async deliver(ctx) {
    return {
      success: true,
      channel: ctx.channel,
      providerId: "noop",
      renderMs: 0,
      providerMs: 0,
    };
  },
};
