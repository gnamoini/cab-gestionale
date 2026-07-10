import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {
  buildAdminNotificationDashboardHref,
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  buildAdminNotificationPreventivoHref,
} from "@/lib/lavorazioni/admin-notifications";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import type { InboxNotificationRow, NotificationType } from "@/lib/notifications/notification-types";

function toBulletModificaRiga(lines: string[]): string {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return "—";
  return filtered.map((l) => `• ${l.replace(/^•\s*/, "")}`).join("\n");
}

const TYPE_LABEL: Partial<Record<NotificationType, string>> = {
  lavorazione_created: "NUOVA LAVORAZIONE",
  lavorazione_completata: "COMPLETATA",
  client_portal_ingresso: "INGRESSO",
  client_portal_completata: "COMPLETATA",
  lavorazioni_ritardo_digest: "IN RITARDO",
  preventivo_approvato: "PREVENTIVO",
  magazzino_sotto_scorta: "MAGAZZINO",
  fatture_scadute_digest: "FATTURE",
  dipendenti_presenze_reminder: "PRESENZE",
  dashboard_promemoria_reminder: "PROMEMORIA",
  admin_dashboard_test: "TEST",
};

const TYPE_TONE: Partial<Record<NotificationType, GestionaleLogViewModel["tone"]>> = {
  lavorazione_created: "create",
  lavorazione_completata: "complete",
  client_portal_ingresso: "create",
  client_portal_completata: "complete",
  lavorazioni_ritardo_digest: "delete",
  preventivo_approvato: "create",
  magazzino_sotto_scorta: "delete",
  fatture_scadute_digest: "delete",
  dipendenti_presenze_reminder: "reopen",
  dashboard_promemoria_reminder: "reopen",
  admin_dashboard_test: "neutral",
};

const OPEN_LINK_LABEL: Partial<Record<NotificationType, string>> = {
  lavorazione_created: "Apri lavorazione",
  lavorazione_completata: "Apri lavorazione",
  client_portal_ingresso: "Apri portale cliente",
  client_portal_completata: "Apri portale cliente",
  lavorazioni_ritardo_digest: "Apri lavorazioni",
  preventivo_approvato: "Apri preventivo",
  magazzino_sotto_scorta: "Apri magazzino",
  fatture_scadute_digest: "Apri fatturazione",
  dipendenti_presenze_reminder: "Apri Dipendenti",
  dashboard_promemoria_reminder: "Apri calendario",
  workshop_schedule_created: "Apri agenda",
  workshop_schedule_updated: "Apri agenda",
  workshop_schedule_deleted: "Apri agenda",
  workshop_schedule_conflict: "Apri agenda",
  workshop_schedule_overdue: "Apri agenda",
  workshop_schedule_not_started: "Apri agenda",
  workshop_schedule_reminder_due: "Apri agenda",
  workshop_schedule_day_saturated: "Apri agenda",
  workshop_schedule_day_empty: "Apri agenda",
  asset_compliance_due: "Apri sicurezza",
  asset_compliance_overdue: "Apri sicurezza",
};

export function getInboxNotificationOpenLinkLabel(row: InboxNotificationRow): string | null {
  return OPEN_LINK_LABEL[row.type] ?? null;
}

export function toInboxNotificationLogViewModel(row: InboxNotificationRow): GestionaleLogViewModel {
  const atIso = row.created_at?.trim() || new Date().toISOString();
  const title = row.title?.trim() || "Notifica";
  const bodyLines = row.body?.trim() ? [row.body.trim()] : ["—"];

  return {
    tone: TYPE_TONE[row.type] ?? "neutral",
    tipoRiga: TYPE_LABEL[row.type] ?? "NOTIFICA",
    oggettoRiga: title,
    modificaRiga: toBulletModificaRiga(bodyLines),
    autore: "Sistema",
    atIso,
  };
}

function normalizeNotificationHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function inboxNotificationHrefFromType(row: InboxNotificationRow): string | null {
  const entityId = row.entity_id?.trim() || null;
  const type = row.type;

  if (
    type === "lavorazione_created" ||
    type === "lavorazione_completata"
  ) {
    return entityId ? buildAdminNotificationLavorazioneHref(entityId) : "/lavorazioni";
  }
  if (type === "client_portal_ingresso" || type === "client_portal_completata") {
    return entityId ? `/lavorazioni-clienti/${encodeURIComponent(entityId)}` : null;
  }
  if (type === "lavorazioni_ritardo_digest") return "/lavorazioni";
  if (type === "preventivo_approvato") {
    return entityId ? buildAdminNotificationPreventivoHref(entityId) : "/preventivi";
  }
  if (type === "magazzino_sotto_scorta") {
    return entityId ? buildAdminNotificationMagazzinoHref(entityId) : "/magazzino";
  }
  if (type === "fatture_scadute_digest") return buildAdminNotificationFatturazioneHref();
  if (type === "dipendenti_presenze_reminder") return buildAdminNotificationDipendentiHref();
  if (type === "dashboard_promemoria_reminder") return buildAdminNotificationDashboardHref();
  if (
    type === "workshop_schedule_created" ||
    type === "workshop_schedule_updated" ||
    type === "workshop_schedule_deleted" ||
    type === "workshop_schedule_conflict" ||
    type === "workshop_schedule_overdue" ||
    type === "workshop_schedule_not_started" ||
    type === "workshop_schedule_reminder_due"
  ) {
    return entityId ? buildAgendaHref({ event: entityId }) : buildAgendaHref();
  }
  if (type === "workshop_schedule_day_saturated" || type === "workshop_schedule_day_empty") {
    return buildAgendaHref();
  }
  if (type === "asset_compliance_due" || type === "asset_compliance_overdue") return "/sicurezza";
  if (type === "admin_dashboard_test") return null;
  return null;
}

export function inboxNotificationHref(row: InboxNotificationRow): string | null {
  const fromType = inboxNotificationHrefFromType(row);
  if (fromType) return fromType;
  const stored = row.href?.trim();
  return stored ? normalizeNotificationHref(stored) : null;
}
