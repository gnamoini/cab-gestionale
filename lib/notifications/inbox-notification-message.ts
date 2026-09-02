import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationOpenMagazzinoHref,
} from "@/lib/lavorazioni/admin-notifications";
import type { InboxNotificationRow, NotificationType } from "@/lib/notifications/notification-types";

function toBulletModificaRiga(lines: string[]): string {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return "—";
  return filtered.map((l) => `• ${l.replace(/^•\s*/, "")}`).join("\n");
}

const TYPE_LABEL: Partial<Record<NotificationType, string>> = {
  lavorazione_created: "NUOVA LAVORAZIONE",
  lavorazione_completata: "COMPLETATA",
  client_portal_ingresso: "NUOVA LAVORAZIONE",
  client_portal_completata: "COMPLETATA",
  magazzino_sotto_scorta: "MAGAZZINO",
  fatture_scadute_digest: "FATTURE",
  dipendenti_presenze_reminder: "PRESENZE",
  admin_dashboard_test: "TEST",
  tagliando_da_eseguire: "TAGLIANDO",
  tagliando_previsto_7g: "TAGLIANDO PREVISTO",
};

const TYPE_TONE: Partial<Record<NotificationType, GestionaleLogViewModel["tone"]>> = {
  lavorazione_created: "create",
  lavorazione_completata: "complete",
  client_portal_ingresso: "create",
  client_portal_completata: "complete",
  magazzino_sotto_scorta: "delete",
  fatture_scadute_digest: "delete",
  dipendenti_presenze_reminder: "reopen",
  admin_dashboard_test: "neutral",
  tagliando_da_eseguire: "delete",
  tagliando_previsto_7g: "delete",
};

const OPEN_LINK_LABEL: Partial<Record<NotificationType, string>> = {
  lavorazione_created: "Apri lavorazione",
  lavorazione_completata: "Apri lavorazione",
  client_portal_ingresso: "Apri portale cliente",
  client_portal_completata: "Apri portale cliente",
  magazzino_sotto_scorta: "Apri magazzino",
  fatture_scadute_digest: "Apri fatturazione",
  dipendenti_presenze_reminder: "Apri Dipendenti",
  tagliando_da_eseguire: "Apri tagliandi",
  tagliando_previsto_7g: "Apri tagliandi",
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

  if (type === "lavorazione_created" || type === "lavorazione_completata") {
    return entityId ? buildAdminNotificationLavorazioneHref(entityId) : "/lavorazioni";
  }
  if (type === "client_portal_ingresso" || type === "client_portal_completata") {
    return entityId ? `/lavorazioni-clienti/${encodeURIComponent(entityId)}` : null;
  }
  if (type === "magazzino_sotto_scorta") {
    return entityId ? buildAdminNotificationOpenMagazzinoHref(entityId) : "/magazzino";
  }
  if (type === "fatture_scadute_digest") return buildAdminNotificationFatturazioneHref();
  if (type === "dipendenti_presenze_reminder") return buildAdminNotificationDipendentiHref();
  if (type === "tagliando_da_eseguire" || type === "tagliando_previsto_7g") return "/mezzi";
  if (type === "admin_dashboard_test") return null;
  return null;
}

export function inboxNotificationHref(row: InboxNotificationRow): string | null {
  const fromType = inboxNotificationHrefFromType(row);
  if (fromType) return fromType;
  const stored = row.href?.trim();
  return stored ? normalizeNotificationHref(stored) : null;
}
