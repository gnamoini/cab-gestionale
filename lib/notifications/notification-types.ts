/** Tipi inbox notifiche v2 — allineati a cab_list_notifications_inbox. */

export const NOTIFICATION_TYPES = [
  "lavorazione_created",
  "lavorazione_completata",
  "lavorazione_aggiornata",
  "lavorazione_eliminata",
  "lavorazione_archiviata",
  "lavorazioni_ritardo_digest",
  "client_portal_ingresso",
  "client_portal_completata",
  "magazzino_sotto_scorta",
  "magazzino_movimento",
  "magazzino_ricambio_creato",
  "magazzino_ricambio_eliminato",
  "fatture_scadute_digest",
  "fattura_emessa",
  "fattura_pagata",
  "fattura_scaduta",
  "dipendenti_presenze_reminder",
  "admin_dashboard_test",
  "tagliando_da_eseguire",
  "tagliando_previsto_7g",
  "preventivo_accettato",
  "preventivo_approvato",
  "preventivo_creato",
  "preventivo_inviato",
  "preventivo_rifiutato",
  "preventivo_convertito",
  "dashboard_promemoria_reminder",
  "mezzo_creato",
  "mezzo_aggiornato",
  "cliente_creato",
  "cliente_aggiornato",
  "attrezzatura_creata",
  "attrezzatura_aggiornata",
  "documento_creato",
  "documento_aggiornato",
  "compliance_in_scadenza",
  "compliance_scaduta",
  "ordine_creato",
  "ordine_aggiornato",
  "system_error",
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
