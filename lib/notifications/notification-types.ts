/** Tipi inbox notifiche v2 — allineati a cab_list_notifications_inbox. */

export const NOTIFICATION_TYPES = [
  "lavorazione_created",
  "lavorazione_completata",
  "client_portal_ingresso",
  "client_portal_completata",
  "magazzino_sotto_scorta",
  "fatture_scadute_digest",
  "dipendenti_presenze_reminder",
  "admin_dashboard_test",
  "tagliando_da_eseguire",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type InboxNotificationRow = {
  id: string;
  created_at: string;
  type: NotificationType;
  scope_type: "user" | "role" | "global";
  scope_value: string | null;
  scope_module: string | null;
  priority: NotificationPriority;
  priority_rank: number;
  title: string;
  body: string;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  dedup_key: string;
  created_by: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  is_unread: boolean;
};

export type InboxCursor = {
  priority_rank: number;
  created_at: string;
  id: string;
};

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  dedup_key: string;
};

export type CreateNotificationResult = {
  id: string | null;
  inserted: boolean;
};
