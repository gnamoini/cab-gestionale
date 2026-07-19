import type { DeliveryChannel } from "@/lib/notifications/application/policies/notification-policy-config";
import type { ResolvedNotification } from "@/lib/notifications/domain/resolved-notification";
import type { EnterpriseNotificationPriority } from "@/lib/notifications/domain/notification-priority";

export type DeliveryPlanItem = {
  channel: DeliveryChannel;
  deviceId?: string;
  providerId: string;
};

export type DeliveryPlan = {
  planId: string;
  notificationIds: string[];
  recipientId: string;
  channels: DeliveryChannel[];
  priority: EnterpriseNotificationPriority;
  scheduledAt: string;
  aggregationKey?: string;
  resolved: ResolvedNotification;
  items: DeliveryPlanItem[];
};

export function createPlanId(): string {
  return crypto.randomUUID();
}
