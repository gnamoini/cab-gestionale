import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import type { ResolvedNotification } from "@/lib/notifications/domain/resolved-notification";
import type { PresenceStatus } from "@/lib/notifications/application/policies/notification-policy-config";

export type DeviceCapabilities = {
  supportsActions: boolean;
  supportsBadge: boolean;
  supportsImage: boolean;
  supportsRequireInteraction: boolean;
  supportsVibrate: boolean;
};

export const DEFAULT_DEVICE_CAPABILITIES: DeviceCapabilities = {
  supportsActions: false,
  supportsBadge: true,
  supportsImage: false,
  supportsRequireInteraction: false,
  supportsVibrate: false,
};

export type UserDeliveryContext = {
  userId: string;
  companyId: string;
  locale: string;
  presence: PresenceStatus;
  preferences: NotificationPreferences;
  devices: DeviceContext[];
};

export type DeviceContext = {
  deviceId: string;
  endpoint?: string;
  userAgent?: string | null;
  capabilities: DeviceCapabilities;
  presence: PresenceStatus;
};

export type NotificationPreferences = {
  categories: Partial<Record<string, boolean>>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  channels_enabled?: Partial<Record<"inbox" | "push" | "email" | "sms", boolean>>;
};

export type NotificationContext = {
  notification: NotificationRecord;
  resolved: ResolvedNotification;
  recipient: { id: string; role: string | null };
  company: { id: string };
  device?: DeviceContext;
  locale: string;
  presence: PresenceStatus;
  preferences: NotificationPreferences;
  capabilities: DeviceCapabilities;
  planId: string;
  channel: string;
};
