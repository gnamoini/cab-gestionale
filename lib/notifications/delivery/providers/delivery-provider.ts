import type { NotificationContext } from "@/lib/notifications/delivery/notification-context";

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
  deliver(ctx: NotificationContext): Promise<DeliveryResult>;
}
