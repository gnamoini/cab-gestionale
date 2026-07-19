import type { PresenceStatus } from "@/lib/notifications/application/policies/notification-policy-config";
import type {
  UserDeliveryContext,
  DeviceContext,
  NotificationPreferences,
  DeviceCapabilities,
} from "@/lib/notifications/delivery/notification-context";
import { DEFAULT_DEVICE_CAPABILITIES } from "@/lib/notifications/delivery/notification-context";

type SubscriptionRow = {
  id: string;
  endpoint: string;
  user_agent: string | null;
  presence_status?: string | null;
  supports_actions?: boolean | null;
  supports_badge?: boolean | null;
  supports_image?: boolean | null;
  supports_require_interaction?: boolean | null;
  supports_vibrate?: boolean | null;
};

type ProfileRow = {
  id: string;
  company_id: string;
  role_key: string | null;
};

const PRESENCE_VALUES: PresenceStatus[] = ["ONLINE", "AWAY", "BACKGROUND", "OFFLINE"];

function parsePresence(value: string | null | undefined): PresenceStatus {
  const u = (value ?? "OFFLINE").toUpperCase();
  if (PRESENCE_VALUES.includes(u as PresenceStatus)) return u as PresenceStatus;
  return "OFFLINE";
}

function mapCapabilities(row: SubscriptionRow): DeviceCapabilities {
  return {
    supportsActions: Boolean(row.supports_actions),
    supportsBadge: row.supports_badge !== false,
    supportsImage: Boolean(row.supports_image),
    supportsRequireInteraction: Boolean(row.supports_require_interaction),
    supportsVibrate: Boolean(row.supports_vibrate),
  };
}

export function buildUserDeliveryContext(
  profile: { id: string; company_id: string; role_key: string | null },
  subscriptions: SubscriptionRow[],
  preferences: NotificationPreferences,
  locale = "it",
): UserDeliveryContext {
  const devices: DeviceContext[] = subscriptions.map((s) => ({
    deviceId: s.id,
    endpoint: s.endpoint,
    userAgent: s.user_agent,
    capabilities: mapCapabilities(s),
    presence: parsePresence(s.presence_status),
  }));

  const presence: PresenceStatus =
    devices.some((d) => d.presence === "ONLINE")
      ? "ONLINE"
      : devices.some((d) => d.presence === "AWAY")
        ? "AWAY"
        : devices.some((d) => d.presence === "BACKGROUND")
          ? "BACKGROUND"
          : "OFFLINE";

  return {
    userId: profile.id,
    companyId: profile.company_id,
    locale,
    presence,
    preferences,
    devices,
  };
}

export function defaultPreferences(): NotificationPreferences {
  return {
    categories: {},
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  };
}

/** Presence resolver — produces context only, no channel decisions. */
export const PresenceResolver = {
  buildUserDeliveryContext,
  defaultPreferences,
};
