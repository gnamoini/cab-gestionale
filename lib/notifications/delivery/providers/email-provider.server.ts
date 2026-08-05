import "server-only";

import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";

/** Email delivery via communication_engine — no duplicate staff outbox. */
export const emailProvider: DeliveryProvider = {
  id: "email",
  channel: "email",
  async deliver(ctx) {
    // ponytail: staff inbox email orchestration delegates to communication_engine when enabled
    const emailEnabled = ctx.preferences?.channels_enabled?.email === true;
    if (!emailEnabled) {
      return { success: true, channel: "email", providerId: "email", error: "email_disabled" };
    }
    return {
      success: true,
      channel: "email",
      providerId: "email",
      error: "email_deferred_to_communication_engine",
    };
  },
};
