import type { NotificationType } from "@/lib/notifications/notification-types";
import { NOTIFICATION_EVENT_CATALOG } from "@/lib/notifications/notification-event-catalog";

export type NotificationTemplateRecord = {
  notification_type: NotificationType;
  title_template: string;
  body_template: string;
  icon: string | null;
  color: string | null;
  actions: { id: string; label: string; href_pattern?: string }[];
  deep_link_pattern: string;
  locale: string;
};

const OPEN_ACTION = { id: "open", label: "Apri" };

/** SSOT template in-memory — allineato a migration notification_templates. */
export const NOTIFICATION_TEMPLATE_REGISTRY: Record<NotificationType, NotificationTemplateRecord> =
  Object.fromEntries(
    NOTIFICATION_EVENT_CATALOG.map((entry) => {
      const deepLink = deepLinkForEvent(entry.notificationEventId, entry.type);
      return [
        entry.type,
        {
          notification_type: entry.type,
          title_template: entry.titleTemplate,
          body_template: entry.description,
          icon: "/icons/icon-192x192.png",
          color: severityColor(entry.severity),
          actions: [OPEN_ACTION],
          deep_link_pattern: deepLink,
          locale: "it",
        } satisfies NotificationTemplateRecord,
      ];
    }),
  ) as Record<NotificationType, NotificationTemplateRecord>;

function severityColor(severity: string): string {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

function deepLinkForEvent(eventId: string, type: NotificationType): string {
  if (type.startsWith("lavorazione") || type === "lavorazioni_ritardo_digest") return "/lavorazioni/{entity_id}";
  if (type.startsWith("client_portal")) return "/lavorazioni-clienti/{entity_id}";
  if (type.startsWith("magazzino") || type.startsWith("ordine")) return "/magazzino/{entity_id}";
  if (type.startsWith("preventivo")) return "/preventivi/{entity_id}";
  if (type.startsWith("fattur") || type === "fatture_scadute_digest") return "/fatturazione";
  if (type.startsWith("mezzo") || type.startsWith("attrezzatura") || type.startsWith("tagliando"))
    return "/mezzi/{entity_id}";
  if (type.startsWith("documento")) return "/documenti/{entity_id}";
  if (type.startsWith("cliente")) return "/fatturazione";
  if (type.startsWith("compliance")) return "/report";
  if (type === "dipendenti_presenze_reminder") return "/dipendenti";
  if (type === "dashboard_promemoria_reminder") return "/dashboard";
  if (type === "system_error") return "/sicurezza";
  if (type === "admin_dashboard_test") return "/dashboard";
  if (eventId.startsWith("dipendenti")) return "/dipendenti";
  return "/dashboard";
}

export function getNotificationTemplate(type: NotificationType): NotificationTemplateRecord | undefined {
  return NOTIFICATION_TEMPLATE_REGISTRY[type];
}

export function resolveDeepLinkFromTemplate(
  type: NotificationType,
  entityId?: string | null,
): string {
  const tpl = getNotificationTemplate(type);
  const pattern = tpl?.deep_link_pattern ?? "/dashboard";
  if (!entityId?.trim()) return pattern.replace("/{entity_id}", "");
  return pattern.replace("{entity_id}", encodeURIComponent(entityId.trim()));
}
