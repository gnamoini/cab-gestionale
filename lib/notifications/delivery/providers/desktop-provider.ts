import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";

export const desktopProvider: DeliveryProvider = {
  id: "desktop",
  async deliver(ctx) {
    return {
      success: true,
      channel: "desktop",
      providerId: "desktop",
    };
  },
};
