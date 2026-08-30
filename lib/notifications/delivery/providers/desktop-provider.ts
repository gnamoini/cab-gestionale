import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";

export const desktopProvider: DeliveryProvider = {
  id: "desktop",
  channel: "desktop",
  async deliver() {
    return {
      success: true,
      channel: "desktop",
      providerId: "desktop",
    };
  },
};
