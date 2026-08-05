import type { NotificationContext } from "@/lib/notifications/delivery/notification-context";
import type { DeliveryChannel } from "@/lib/notifications/application/policies/notification-policy-config";

export type DeliveryResult = {
  success: boolean;
  channel: string;
  providerId: string;
  error?: string;
  dispatchMs?: number;
  providerMs?: number;
  renderMs?: number;
  deliveryId?: string;
};

export interface DeliveryProvider {
  readonly id: string;
  readonly channel: DeliveryChannel;
  deliver(ctx: NotificationContext): Promise<DeliveryResult>;
}
