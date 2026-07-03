import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {
  isAdminDashboardTestNotification,
  isDashboardPromemoriaReminderNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isLavorazioniRitardoDigestNotification,
  isMagazzinoDashboardNotification,
  isPreventivoApprovatoNotification,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import { formatDipendentiPresenzeReminderBody, formatDipendentiPresenzeReminderTitle } from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { formatLavorazioniRitardoDigestBody } from "@/lib/lavorazioni/lavorazioni-ritardo-digest";

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
  if (isLavorazioniRitardoDigestNotification(row)) return "Apri lavorazioni";
  if (isPreventivoApprovatoNotification(row)) return "Apri preventivo";
  if (isMagazzinoDashboardNotification(row)) return "Apri magazzino";
  if (isFattureScaduteDigestNotification(row)) return "Apri fatturazione";
  if (isDipendentiPresenzeReminderNotification(row)) return "Apri Dipendenti";
  if (isDashboardPromemoriaReminderNotification(row)) return "Apri calendario";
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
      modificaRiga: toBulletModificaRiga(["Pronta per follow-up amministrativo"]),
      autore: row.createdBy?.trim() || "Sistema",
      atIso,
    };
  }

  if (isLavorazioniRitardoDigestNotification(row)) {
    return {
      tone: "neutral",
      tipoRiga: "IN RITARDO",
      oggettoRiga: `${row.count} lavorazioni in ritardo`,
      modificaRiga: toBulletModificaRiga([formatLavorazioniRitardoDigestBody(row)]),
      autore: "Sistema",
      atIso,
    };
  }

  if (isPreventivoApprovatoNotification(row)) {
    return {
      tone: "create",
      tipoRiga: "PREVENTIVO",
      oggettoRiga: row.numero?.trim() || "Preventivo approvato",
      modificaRiga: toBulletModificaRiga([row.cliente?.trim() || "Approvato — procedi con fatturazione"]),
      autore: "Sistema",
      atIso,
    };
  }

  if (isMagazzinoDashboardNotification(row)) {
    const oggetto = row.descrizione?.trim() || (row.esaurito ? "Ricambio esaurito" : "Ricambio sotto scorta");
    const lines: string[] = [];
    if (row.marca?.trim()) lines.push(`Marca: ${row.marca.trim()}`);
    lines.push(row.esaurito ? "Scorta: 0" : `Scorta: ${row.scorta} (min. ${row.scortaMinima})`);
    return {
      tone: "update",
      tipoRiga: row.esaurito ? "ESAURITO" : "SOTTO SCORTA",
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

  if (isDashboardPromemoriaReminderNotification(row)) {
    return {
      tone: "neutral",
      tipoRiga: "PROMEMORIA",
      oggettoRiga: row.title?.trim() || "Calendario",
      modificaRiga: toBulletModificaRiga([row.message?.trim() || "Promemoria in scadenza"]),
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
