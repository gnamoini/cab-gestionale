import type { NotificationType } from "@/lib/notifications/notification-types";
import type { NotificationPolicyConfig } from "@/lib/notifications/application/policies/notification-policy-config";

const DEFAULT_PRESENCE: NotificationPolicyConfig["presencePolicy"] = {
  ONLINE: ["sidebar", "realtime", "badge", "push"],
  AWAY: ["sidebar", "realtime", "push"],
  BACKGROUND: ["push"],
  OFFLINE: ["push"],
};

const OPEN_ACTION = { id: "open", labelKey: "notification.action.open" } as const;

/** Declarative SSOT — ChannelPolicyResolver interprets. */
export const NOTIFICATION_POLICIES: Partial<Record<NotificationType, NotificationPolicyConfig>> = {
  lavorazione_created: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  lavorazione_completata: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "NORMAL",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  magazzino_sotto_scorta: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "bundle_push", windowSeconds: 60, maxBundle: 50 },
    ttlDays: 7,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  fatture_scadute_digest: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: 30,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  dipendenti_presenze_reminder: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: 1,
    priority: "NORMAL",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  tagliando_da_eseguire: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  tagliando_previsto_7g: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  client_portal_ingresso: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "HIGH",
    actions: [OPEN_ACTION],
    presencePolicy: {
      ONLINE: ["sidebar", "realtime", "badge", "push"],
      AWAY: ["sidebar", "realtime", "push"],
      BACKGROUND: ["push"],
      OFFLINE: ["push"],
    },
  },
  client_portal_completata: {
    channels: ["sidebar", "realtime", "push"],
    aggregation: { mode: "none" },
    ttlDays: null,
    priority: "NORMAL",
    actions: [OPEN_ACTION],
    presencePolicy: DEFAULT_PRESENCE,
  },
  admin_dashboard_test: {
    channels: ["sidebar", "realtime", "push", "desktop"],
    aggregation: { mode: "none" },
    ttlDays: 1,
    priority: "LOW",
    actions: [OPEN_ACTION],
    presencePolicy: {
      ONLINE: ["sidebar", "realtime", "badge", "push"],
      AWAY: ["sidebar", "realtime", "push"],
      BACKGROUND: ["push"],
      OFFLINE: ["push"],
    },
  },
};

export function getNotificationPolicy(type: NotificationType): NotificationPolicyConfig {
  return (
    NOTIFICATION_POLICIES[type] ?? {
      channels: ["sidebar", "realtime"],
      aggregation: { mode: "none" },
      ttlDays: null,
      priority: "NORMAL",
      actions: [OPEN_ACTION],
      presencePolicy: DEFAULT_PRESENCE,
    }
  );
}
