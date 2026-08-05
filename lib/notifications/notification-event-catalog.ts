import type { DomainEventType } from "@/lib/notifications/domain/domain-event";
import type { NotificationType, NotificationPriority } from "@/lib/notifications/notification-types";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

export type NotificationRecipientTier = "admin" | "ufficio" | "officina" | "cliente";

export type NotificationTriggerKind = "cab-sync" | "scheduled" | "db-trigger";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationMode = "optional" | "mandatory";

export type PageAccessRequirement = "read" | "write";

export type NotificationEventDefinition = {
  /** SSOT preferenze + dispatch — distinto dal domain event. */
  notificationEventId: string;
  /** Evento dominio sorgente (opzionale). */
  domainEvent?: DomainEventType;
  type: NotificationType;
  pageKey: GestionalePageKey;
  requiredAccess: PageAccessRequirement;
  module: string | null;
  scopeType: "user" | "role" | "global";
  scopeValue: string | null;
  priority: NotificationPriority;
  recipients: Record<NotificationRecipientTier, boolean>;
  trigger: NotificationTriggerKind;
  dedupKeyPattern: string;
  titleTemplate: string;
  description: string;
  defaultEnabled: boolean;
  userConfigurable: boolean;
  notificationMode: NotificationMode;
  /** Se true, l'autore dell'evento riceve la notifica. */
  notifyAuthor: boolean;
  severity: NotificationSeverity;
};

/** SSOT catalogo eventi notificabili — allineato a notification_type_registry (migration). */
import { NOTIFICATION_EVENT_CATALOG_EXTENDED } from "@/lib/notifications/notification-event-catalog-extended";

const NOTIFICATION_EVENT_CATALOG_BASE: readonly NotificationEventDefinition[] = [
  {
    notificationEventId: "lavorazioni.created",
    domainEvent: "work_order.created",
    type: "lavorazione_created",
    pageKey: "lavorazioni",
    requiredAccess: "read",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}",
    titleTemplate: "Nuova lavorazione",
    description: "Quando un collega crea una nuova lavorazione",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "info",
  },
  {
    notificationEventId: "lavorazioni.completed",
    domainEvent: "work_order.completed",
    type: "lavorazione_completata",
    pageKey: "lavorazioni",
    requiredAccess: "read",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "medium",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "lav:{lavorazioneId}:done",
    titleTemplate: "Lavorazione completata",
    description: "Quando una lavorazione viene segnata come completata",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "info",
  },
  {
    notificationEventId: "lavorazioni.tagliando_due",
    domainEvent: "maintenance.due",
    type: "tagliando_da_eseguire",
    pageKey: "lavorazioni",
    requiredAccess: "read",
    module: "lavorazioni",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "tagliando-due:{lavorazioneId}",
    titleTemplate: "Tagliando da eseguire",
    description: "Quando un tagliando è in scadenza (circa 50 ore) o non risulta ancora eseguito",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "warning",
  },
  {
    notificationEventId: "mezzi.tagliando_forecast_7g",
    type: "tagliando_previsto_7g",
    pageKey: "mezzi",
    requiredAccess: "read",
    module: "mezzi",
    scopeType: "role",
    scopeValue: "admin",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: false, cliente: false },
    trigger: "scheduled",
    dedupKeyPattern: "tagliando-forecast:{configId}:{dateBucket}",
    titleTemplate: "Tagliando previsto entro 7 giorni",
    description: "Quando un tagliando è previsto entro una settimana",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "critical",
  },
  {
    notificationEventId: "magazzino.below_minimum",
    domainEvent: "inventory.below_minimum",
    type: "magazzino_sotto_scorta",
    pageKey: "magazzino",
    requiredAccess: "read",
    module: "magazzino",
    scopeType: "role",
    scopeValue: "operatore",
    priority: "high",
    recipients: { admin: true, ufficio: false, officina: true, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "mag:{ricambioId}:crossing",
    titleTemplate: "Scorta bassa o esaurita",
    description: "Quando un ricambio scende sotto la scorta minima o finisce",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "warning",
  },
  {
    notificationEventId: "dipendenti.presence_reminder",
    domainEvent: "employees.presence_reminder",
    type: "dipendenti_presenze_reminder",
    pageKey: "dipendenti",
    requiredAccess: "read",
    module: "dipendenti",
    scopeType: "role",
    scopeValue: "admin",
    priority: "medium",
    recipients: { admin: true, ufficio: false, officina: false, cliente: false },
    trigger: "scheduled",
    dedupKeyPattern: "dip-pres:{yyyy-mm-dd}",
    titleTemplate: "Presenze dipendenti",
    description: "Promemoria nei giorni feriali alle 17:00 se mancano ore di presenza",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: false,
    severity: "info",
  },
  {
    notificationEventId: "lavorazioni_clienti.ingresso",
    domainEvent: "client_portal.work_order_ingress",
    type: "client_portal_ingresso",
    pageKey: "lavorazioni_clienti",
    requiredAccess: "read",
    module: "lavorazioni",
    scopeType: "user",
    scopeValue: null,
    priority: "high",
    recipients: { admin: false, ufficio: false, officina: false, cliente: true },
    trigger: "db-trigger",
    dedupKeyPattern: "client-portal:ingresso:{userId}:{lavorazioneId}",
    titleTemplate: "Nuova lavorazione",
    description: "Quando viene aperta una nuova lavorazione sul tuo mezzo",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: true,
    severity: "info",
  },
  {
    notificationEventId: "lavorazioni_clienti.completed",
    domainEvent: "client_portal.work_order_completed",
    type: "client_portal_completata",
    pageKey: "lavorazioni_clienti",
    requiredAccess: "read",
    module: "lavorazioni",
    scopeType: "user",
    scopeValue: null,
    priority: "medium",
    recipients: { admin: false, ufficio: false, officina: false, cliente: true },
    trigger: "db-trigger",
    dedupKeyPattern: "client-portal:completata:{userId}:{lavorazioneId}",
    titleTemplate: "Lavorazione completata",
    description: "Quando una lavorazione sul tuo mezzo risulta completata",
    defaultEnabled: true,
    userConfigurable: true,
    notificationMode: "optional",
    notifyAuthor: true,
    severity: "info",
  },
  {
    notificationEventId: "system.dashboard_test",
    type: "admin_dashboard_test",
    pageKey: "dashboard",
    requiredAccess: "read",
    module: null,
    scopeType: "user",
    scopeValue: null,
    priority: "low",
    recipients: { admin: true, ufficio: false, officina: false, cliente: false },
    trigger: "cab-sync",
    dedupKeyPattern: "test:{userId}:{minuteBucket}",
    titleTemplate: "Test notifiche",
    description: "Serve solo per provare le notifiche",
    defaultEnabled: true,
    userConfigurable: false,
    notificationMode: "optional",
    notifyAuthor: true,
    severity: "info",
  },
] as const;

export const NOTIFICATION_EVENT_CATALOG: readonly NotificationEventDefinition[] = [
  ...NOTIFICATION_EVENT_CATALOG_BASE,
  ...NOTIFICATION_EVENT_CATALOG_EXTENDED,
] as const;

/** Alias SSOT — stesso array del catalogo eventi notificabili. */
export const notificationRegistry = NOTIFICATION_EVENT_CATALOG;

export function getNotificationEventDefinition(
  type: NotificationType,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_CATALOG.find((d) => d.type === type);
}

export function getNotificationRegistryEntry(
  notificationEventId: string,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_CATALOG.find((d) => d.notificationEventId === notificationEventId);
}

export function getNotificationRegistryEntryByDomainEvent(
  domainEvent: DomainEventType,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_CATALOG.find((d) => d.domainEvent === domainEvent);
}

export const IMPLEMENTED_NOTIFICATION_TYPES = NOTIFICATION_EVENT_CATALOG.filter(
  (d) => d.type !== "admin_dashboard_test",
).map((d) => d.type);

export const CONFIGURABLE_NOTIFICATION_EVENT_IDS = NOTIFICATION_EVENT_CATALOG.filter(
  (d) => d.userConfigurable && d.notificationMode === "optional",
).map((d) => d.notificationEventId);
