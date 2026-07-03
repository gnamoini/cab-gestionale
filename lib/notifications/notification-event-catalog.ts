import type { NotificationType, NotificationPriority } from "@/lib/notifications/notification-types";

export type NotificationRecipientTier = "admin" | "ufficio" | "officina";

export type NotificationTriggerKind = "cab-sync" | "scheduled";

export type NotificationEventDefinition = {
  type: NotificationType;
  module: string | null;
  scopeType: "user" | "role" | "global";
  scopeValue: string | null;
  priority: NotificationPriority;
  recipients: Record<NotificationRecipientTier, boolean>;
  trigger: NotificationTriggerKind;
  dedupKeyPattern: string;
  titleTemplate: string;
  description: string;
};

/** SSOT catalogo eventi — allineato a notification_type_registry (migration). */
export const NOTIFICATION_EVENT_CATALOG: readonly NotificationEventDefinition[] = [
  {
    type: "lavorazione_created",
    module: null,
    scopeType: "global",
    scopeValue: null,
    priority: "high",
    recipients: { admin: true, ufficio: true, officina: true },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}",
    titleTemplate: "Nuova lavorazione",
    description: "Lavorazione creata da un altro utente/dispositivo",
  },
  {
    type: "lavorazione_completata",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "addetto_amministrativo",
    priority: "medium",
    recipients: { admin: true, ufficio: true, officina: false },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}:done",
    titleTemplate: "Lavorazione completata",
    description: "Stato passato a completata — follow-up amministrativo",
  },
  {
    type: "lavorazioni_ritardo_digest",
    module: null,
    scopeType: "global",
    scopeValue: null,
    priority: "high",
    recipients: { admin: true, ufficio: true, officina: true },
    trigger: "scheduled",
    dedupKeyPattern: "lav-late:{yyyy-mm-dd}",
    titleTemplate: "Lavorazioni in ritardo",
    description: "Digest giornaliero lavorazioni oltre soglia SLA",
  },
  {
    type: "preventivo_approvato",
    module: "preventivi",
    scopeType: "role",
    scopeValue: "addetto_amministrativo",
    priority: "high",
    recipients: { admin: true, ufficio: true, officina: false },
    trigger: "cab-sync",
    dedupKeyPattern: "prev:{preventivoId}:approved",
    titleTemplate: "Preventivo approvato",
    description: "Transizione stato → approvato",
  },
  {
    type: "magazzino_sotto_scorta",
    module: "magazzino",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true },
    trigger: "cab-sync",
    dedupKeyPattern: "mag:{ricambioId}:crossing",
    titleTemplate: "Sotto scorta / esaurito",
    description: "Crossing scorta minima o esaurimento pezzi",
  },
  {
    type: "fatture_scadute_digest",
    module: "fatturazione",
    scopeType: "role",
    scopeValue: "addetto_amministrativo",
    priority: "high",
    recipients: { admin: true, ufficio: true, officina: false },
    trigger: "scheduled",
    dedupKeyPattern: "fatt-scad:{yyyy-mm-dd}",
    titleTemplate: "Fatture scadute",
    description: "Digest giornaliero fatture con residuo oltre scadenza",
  },
  {
    type: "dashboard_promemoria_reminder",
    module: null,
    scopeType: "global",
    scopeValue: null,
    priority: "medium",
    recipients: { admin: true, ufficio: true, officina: true },
    trigger: "scheduled",
    dedupKeyPattern: "prom:{promemoriaId}:{eventDateYmd}",
    titleTemplate: "Promemoria calendario",
    description: "Promemoria dashboard creato dall'utente",
  },
  {
    type: "dipendenti_presenze_reminder",
    module: "dipendenti",
    scopeType: "global",
    scopeValue: null,
    priority: "medium",
    recipients: { admin: true, ufficio: true, officina: true },
    trigger: "scheduled",
    dedupKeyPattern: "dip-pres:{yyyy-mm-dd}",
    titleTemplate: "Presenze dipendenti",
    description: "Promemoria ore presenze mancanti (17:00 feriali)",
  },
  {
    type: "admin_dashboard_test",
    module: null,
    scopeType: "user",
    scopeValue: null,
    priority: "low",
    recipients: { admin: true, ufficio: false, officina: false },
    trigger: "cab-sync",
    dedupKeyPattern: "test:{userId}:{minuteBucket}",
    titleTemplate: "Test notifiche",
    description: "Verifica campanella/desktop",
  },
] as const;

export function getNotificationEventDefinition(
  type: NotificationType,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_CATALOG.find((d) => d.type === type);
}

export const IMPLEMENTED_NOTIFICATION_TYPES = NOTIFICATION_EVENT_CATALOG.filter(
  (d) => d.type !== "admin_dashboard_test",
).map((d) => d.type);
