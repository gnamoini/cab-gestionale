import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
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

export function getInboxNotificationOpenLinkLabel(row: InboxNotificationRow): string | null {
  switch (row.type) {
    case "lavorazione_created":
    case "lavorazione_completata":
    case "client_portal_ingresso":
    case "client_portal_completata":
      return "Apri lavorazione";
    case "lavorazioni_ritardo_digest":
      return "Apri lavorazioni";
    case "preventivo_approvato":
      return "Apri preventivo";
    case "magazzino_sotto_scorta":
      return "Apri magazzino";
    case "fatture_scadute_digest":
      return "Apri fatturazione";
    case "dipendenti_presenze_reminder":
      return "Apri Dipendenti";
    case "dashboard_promemoria_reminder":
      return "Apri calendario";
    default:
      return null;
  }
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

export function inboxNotificationHref(row: InboxNotificationRow): string | null {
  if (row.href?.trim()) return row.href.trim();
  return null;
}
