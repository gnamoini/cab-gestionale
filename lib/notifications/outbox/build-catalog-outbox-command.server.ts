import "server-only";

import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";
import { emptySnapshot } from "@/lib/notifications/domain/notification-snapshot";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import {
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  buildAdminNotificationPreventivoHref,
} from "@/lib/lavorazioni/admin-notifications";
import type { OutboxRow } from "@/lib/notifications/outbox/build-legacy-from-outbox.server";
import { toEnterprisePriority } from "@/lib/notifications/domain/notification-priority";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

function recipientDedupKey(baseDedup: string, recipientId: string): string {
  return `${baseDedup}:u:${recipientId}`;
}

function recipientIdempotencyKey(baseKey: string, recipientId: string): string {
  return `${baseKey}:recipient:${recipientId}`;
}

function resolveDeepLink(pageKey: GestionalePageKey, entityType: string, entityId: string): string {
  if (pageKey === "lavorazioni" || entityType === "lavorazioni") {
    return buildAdminNotificationLavorazioneHref(entityId);
  }
  if (pageKey === "preventivi" || entityType === "preventivi") {
    return buildAdminNotificationPreventivoHref(entityId);
  }
  if (pageKey === "magazzino" || entityType === "magazzino_ricambi" || entityType === "movimenti_ricambi") {
    if (entityType === "movimenti_ricambi") return "/magazzino";
    return buildAdminNotificationMagazzinoHref(entityId);
  }
  if (pageKey === "fatturazione" || entityType === "invoices") {
    return buildAdminNotificationFatturazioneHref();
  }
  const paths: Partial<Record<GestionalePageKey, string>> = {
    mezzi: "/mezzi",
    documenti: "/documenti",
    dipendenti: "/dipendenti",
    dashboard: "/dashboard",
    report: "/report",
    fatturazione: "/fatturazione",
    preventivi: "/preventivi",
    magazzino: "/magazzino",
    lavorazioni: "/lavorazioni",
  };
  return paths[pageKey] ?? "/dashboard";
}

function resolveDedupKey(pattern: string, entityId: string, payload: Record<string, unknown>): string {
  const replacements: Record<string, string> = {
    preventivoId: entityId,
    lavorazioneId: entityId,
    fatturaId: entityId,
    mezzoId: entityId,
    clienteId: entityId,
    documentoId: entityId,
    ricambioId: entityId,
    movimentoId: entityId,
    ordineId: entityId,
    assetId: entityId,
    rev: String(payload.rev ?? payload.updated_at ?? Date.now()),
    dateBucket: String(payload.date_bucket ?? new Date().toISOString().slice(0, 10)),
  };
  return pattern.replace(/\{(\w+)\}/g, (_, token: string) => replacements[token] ?? entityId);
}

function buildTitle(
  notificationEventId: string,
  titleTemplate: string,
  payload: Record<string, unknown>,
): string {
  if (notificationEventId === "preventivi.accepted") {
    if (payload.method === "timeout_automatico") {
      return "Preventivo accettato automaticamente";
    }
    return "Preventivo accettato dal cliente";
  }
  return titleTemplate;
}

function buildBody(entryDescription: string, payload: Record<string, unknown>, notificationEventId: string): string {
  const label =
    (typeof payload.label === "string" && payload.label.trim()) ||
    (typeof payload.cliente === "string" && payload.cliente.trim()) ||
    (typeof payload.numero === "string" && payload.numero.trim()) ||
    "";
  if (notificationEventId === "preventivi.accepted" && payload.method === "timeout_automatico") {
    const base = "Accettazione automatica per mancata risposta entro 24 ore";
    return label ? `${base}: ${label}` : base;
  }
  return label ? `${entryDescription}: ${label}` : entryDescription;
}

/** Catalog-driven dispatch for outbox events without legacy AdminDashboardNotification mappers. */
export function buildCatalogOutboxCommand(
  row: OutboxRow,
): ((recipientId: string) => PublishNotificationCommand) | null {
  const entry = getNotificationRegistryEntry(row.notification_event_id);
  if (!entry) return null;

  const payload = row.payload ?? {};
  const entityId = row.entity_id;
  const dedupKey = resolveDedupKey(entry.dedupKeyPattern, entityId, payload);
  const idempotencyKey = row.notification_event_id + ":" + entityId;

  const base: Omit<PublishNotificationCommand, "scope" | "dedupKey" | "idempotencyKey"> = {
    notificationType: entry.type,
    sourceDomainEvent: entry.domainEvent,
    translationKey: `notification.${entry.type}`,
    translationParams: { entityId, ...payload },
    snapshot: emptySnapshot(),
    title: buildTitle(row.notification_event_id, entry.titleTemplate, payload),
    body: buildBody(entry.description, payload, row.notification_event_id),
    deepLink: resolveDeepLink(entry.pageKey, row.entity_type, entityId),
    entityType: row.entity_type,
    entityId,
    actorId: row.actor_id ?? "server",
    priority: toEnterprisePriority(entry.priority),
  };

  return (recipientId: string) => ({
    ...base,
    scope: { type: "user", value: recipientId },
    dedupKey: recipientDedupKey(dedupKey, recipientId),
    idempotencyKey: recipientIdempotencyKey(idempotencyKey, recipientId),
  });
}
