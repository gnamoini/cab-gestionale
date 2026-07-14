import type { NotificationType, NotificationPriority } from "@/lib/notifications/notification-types";

export type NotificationRecipientTier = "admin" | "ufficio" | "officina" | "cliente";

export type NotificationTriggerKind = "cab-sync" | "scheduled" | "db-trigger";

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
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}",
    titleTemplate: "Nuova lavorazione",
    description: "Lavorazione creata da un altro utente/dispositivo",
  },
  {
    type: "lavorazione_completata",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "medium",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}:done",
    titleTemplate: "Lavorazione completata",
    description: "Stato passato a completata",
  },
  {
    type: "tagliando_da_eseguire",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "tagliando-due:{lavorazioneId}",
    titleTemplate: "Tagliando da eseguire",
    description: "Milestone tagliando entro 50 h o non segnata fatta in matrice",
  },
  {
    type: "magazzino_sotto_scorta",
    module: "magazzino",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
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
    recipients: { admin: true, ufficio: true, officina: false, cliente: false },
    trigger: "scheduled",
    dedupKeyPattern: "fatt-scad:{yyyy-mm-dd}",
    titleTemplate: "Fatture scadute",
    description: "Digest giornaliero fatture con residuo oltre scadenza",
  },
  {
    type: "dipendenti_presenze_reminder",
    module: "dipendenti",
    scopeType: "role",
    scopeValue: "admin",
    priority: "medium",
    recipients: { admin: true, ufficio: false, officina: false, cliente: false },
    trigger: "scheduled",
    dedupKeyPattern: "dip-pres:{yyyy-mm-dd}",
    titleTemplate: "Presenze dipendenti",
    description: "Promemoria ore presenze mancanti (17:00 feriali)",
  },
  {
    type: "client_portal_ingresso",
    module: "lavorazioni",
    scopeType: "user",
    scopeValue: null,
    priority: "high",
    recipients: { admin: false, ufficio: false, officina: false, cliente: true },
    trigger: "db-trigger",
    dedupKeyPattern: "client-portal:ingresso:{userId}:{lavorazioneId}",
    titleTemplate: "Nuova lavorazione",
    description: "Insert lavorazione → utenti cliente con accesso portale (cliente_ref + allowlist)",
  },
  {
    type: "client_portal_completata",
    module: "lavorazioni",
    scopeType: "user",
    scopeValue: null,
    priority: "medium",
    recipients: { admin: false, ufficio: false, officina: false, cliente: true },
    trigger: "db-trigger",
    dedupKeyPattern: "client-portal:completata:{userId}:{lavorazioneId}",
    titleTemplate: "Lavorazione completata",
    description: "Stato lavorazione → completata per utenti portale cliente",
  },
  {
    type: "admin_dashboard_test",
    module: null,
    scopeType: "user",
    scopeValue: null,
    priority: "low",
    recipients: { admin: true, ufficio: false, officina: false, cliente: false },
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
