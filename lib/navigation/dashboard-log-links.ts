import type { LavorazioniLogEntry } from "@/lib/lavorazioni/lavorazioni-change-log";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

/** Query: focus riga lavorazioni (attiva o storico). */
export const Q_FOCUS_LAV_ROW = "focusLav";
export const Q_FOCUS_LAV_TARGET = "focusLavTarget";
/** Titolo log (fallback match storico se id cambiato). */
export const Q_FOCUS_LAV_TITOLO = "focusLavTitolo";

/** Query: focus ricambio in tabella magazzino. */
export const Q_FOCUS_RICAMBIO = "focusRicambio";

/** Query: apre modale info ricambio. */
export const Q_OPEN_RICAMBIO = "openRicambio";

/** Origine apertura ricambio (qr, manual, dashboard, report). */
export const Q_OPEN_SOURCE = "source";

export type OpenRicambioSource = "qr" | "manual" | "dashboard" | "report";

/** Query: evidenzia lavorazioni collegate a un mezzo (anagrafica id). Valori speciali es. `hub-lav-*`. */
export const Q_FOCUS_MEZZO = "focusMezzo";

/** Query: filtro contestuale lavorazioni per id mezzo anagrafica (URL “pulito” da Mezzi / dashboard). */
export const Q_LAVORAZIONI_MEZZO_ID = "mezzoId";

export function buildLavorazioniLogFocusHref(entry: LavorazioniLogEntry): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, entry.recordId);
  sp.set(Q_FOCUS_LAV_TARGET, entry.target);
  const t = entry.titolo.trim();
  if (t) sp.set(Q_FOCUS_LAV_TITOLO, t);
  return `/lavorazioni?${sp.toString()}`;
}

export function buildMagazzinoLogFocusHref(entry: MagazzinoChangeLogEntry): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_RICAMBIO, entry.ricambioId);
  return `/magazzino?${sp.toString()}`;
}

export function buildMagazzinoOpenRicambioHref(
  ricambioId: string,
  source: OpenRicambioSource = "manual",
): string {
  const sp = new URLSearchParams();
  sp.set(Q_OPEN_RICAMBIO, ricambioId.trim());
  if (source) sp.set(Q_OPEN_SOURCE, source);
  return `/magazzino?${sp.toString()}`;
}
