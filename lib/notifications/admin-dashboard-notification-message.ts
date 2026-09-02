import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {
  isAdminDashboardTestNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import {
  formatDipendentiPresenzeReminderBody,
  formatDipendentiPresenzeReminderTitle,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";

function toBulletModificaRiga(lines: string[]): string {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return "—";
  return filtered.map((l) => `• ${l.replace(/^•\s*/, "")}`).join("\n");
}

/** Etichetta link azione sotto il messaggio (null = nessun link). */
export function getAdminNotificationOpenLinkLabel(row: AdminDashboardNotification): string | null {
  if (isAdminDashboardTestNotification(row)) return null;
  if (isLavorazioneDashboardNotification(row)) return "Apri lavorazione";
  if (isLavorazioneCompletataNotification(row)) return "Apri lavorazione";
  if (isMagazzinoDashboardNotification(row)) return "Apri magazzino";
  if (isFattureScaduteDigestNotification(row)) return "Apri fatturazione";
  if (isDipendentiPresenzeReminderNotification(row)) return "Apri Dipendenti";
  return null;
}

/** Converte una notifica dashboard in voce messaggio (stile log modifiche). */
export function toAdminNotificationLogViewModel(row: AdminDashboardNotification): GestionaleLogViewModel {
  const atIso = row.createdAt?.trim() || new Date().toISOString();

  if (isAdminDashboardTestNotification(row)) {
    return {
      tone: "neutral",
      tipoRiga: "TEST",
      oggettoRiga: "Test notifiche",
      modificaRiga: toBulletModificaRiga([row.message]),
      autore: "Sistema",
      atIso,
    };
  }

  if (isLavorazioneDashboardNotification(row)) {
    const oggetto = row.cliente?.trim() || row.titolo?.trim() || "Nuova lavorazione";
    const lines: string[] = [];
    if (row.mezzo?.trim()) lines.push(`Mezzo: ${row.mezzo.trim()}`);
    if (row.targa?.trim()) lines.push(`Targa: ${row.targa.trim()}`);
    if (row.titolo?.trim() && row.titolo.trim() !== oggetto) lines.push(`Codice: ${row.titolo.trim()}`);
    return {
      tone: "create",
      tipoRiga: "NUOVA LAVORAZIONE",
      oggettoRiga: oggetto,
      modificaRiga: toBulletModificaRiga(lines.length > 0 ? lines : ["Lavorazione registrata"]),
      autore: row.createdBy?.trim() || "Sistema",
      atIso,
    };
  }

  if (isLavorazioneCompletataNotification(row)) {
    const oggetto = row.cliente?.trim() || row.titolo?.trim() || "Lavorazione completata";
    return {
      tone: "update",
      tipoRiga: "COMPLETATA",
      oggettoRiga: oggetto,
      modificaRiga: toBulletModificaRiga(["Lavorazione completata"]),
      autore: row.createdBy?.trim() || "Sistema",
      atIso,
    };
  }

  if (isMagazzinoDashboardNotification(row)) {
    const oggetto = row.descrizione?.trim() || "Ricambio sotto scorta";
    const lines: string[] = [];
    if (row.codice?.trim()) lines.push(`Codice: ${row.codice.trim()}`);
    if (row.marca?.trim()) lines.push(`Marca: ${row.marca.trim()}`);
    lines.push(`Disponibili: ${row.scorta} — Soglia minima: ${row.scortaMinima}`);
    return {
      tone: "update",
      tipoRiga: "SOTTO SCORTA",
      oggettoRiga: oggetto,
      modificaRiga: toBulletModificaRiga(lines),
      autore: "Sistema",
      atIso,
    };
  }

  if (isFattureScaduteDigestNotification(row)) {
    return {
      tone: "neutral",
      tipoRiga: "FATTURE",
      oggettoRiga: `${row.count} fatture scadute`,
      modificaRiga: toBulletModificaRiga([formatFattureScaduteDigestBody(row)]),
      autore: "Sistema",
      atIso,
    };
  }

  if (isDipendentiPresenzeReminderNotification(row)) {
    return {
      tone: "reopen",
      tipoRiga: "PRESENZE",
      oggettoRiga: formatDipendentiPresenzeReminderTitle(row.count),
      modificaRiga: toBulletModificaRiga([formatDipendentiPresenzeReminderBody(row)]),
      autore: "Sistema",
      atIso,
    };
  }

  return {
    tone: "neutral",
    tipoRiga: "NOTIFICA",
    oggettoRiga: "Dashboard",
    modificaRiga: "—",
    autore: "Sistema",
    atIso,
  };
}
