import type { PresenceStatus } from "@/lib/notifications/application/policies/notification-policy-config";
import type {
  UserDeliveryContext,
  DeviceContext,
  NotificationPreferences,
  DeviceCapabilities,
} from "@/lib/notifications/delivery/notification-context";

type SubscriptionRow = {
  id: string;
  endpoint: string;
  user_agent: string | null;
  presence_status?: string | null;
  presence_updated_at?: string | null;
  supports_actions?: boolean | null;
  supports_badge?: boolean | null;
  supports_image?: boolean | null;
  supports_require_interaction?: boolean | null;
  supports_vibrate?: boolean | null;
};

/** ponytail: 3× heartbeat client (30s) — upgrade: parametro DB o env */
export const PRESENCE_STALE_ONLINE_MS = 90_000;


const PRESENCE_VALUES: PresenceStatus[] = ["ONLINE", "AWAY", "BACKGROUND", "OFFLINE"];

function parsePresence(value: string | null | undefined): PresenceStatus {
  const u = (value ?? "OFFLINE").toUpperCase();
  if (PRESENCE_VALUES.includes(u as PresenceStatus)) return u as PresenceStatus;
  return "OFFLINE";
}

export function resolveDevicePresence(
  row: Pick<SubscriptionRow, "presence_status" | "presence_updated_at">,
  now = Date.now(),
): PresenceStatus {
  const raw = parsePresence(row.presence_status);
  if (raw !== "ONLINE") return raw;
  const updatedAt = row.presence_updated_at ? Date.parse(row.presence_updated_at) : NaN;
  if (!Number.isFinite(updatedAt) || now - updatedAt > PRESENCE_STALE_ONLINE_MS) return "BACKGROUND";
  return "ONLINE";
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
  now = Date.now(),
): UserDeliveryContext {
  const devices: DeviceContext[] = subscriptions.map((s) => ({
    deviceId: s.id,
    endpoint: s.endpoint,
    userAgent: s.user_agent,
    capabilities: mapCapabilities(s),
    presence: resolveDevicePresence(s, now),
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
  resolveDevicePresence,
};
