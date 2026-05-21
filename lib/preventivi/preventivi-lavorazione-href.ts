import { Q_FOCUS_LAV_ROW, Q_FOCUS_LAV_TARGET } from "@/lib/navigation/dashboard-log-links";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { normMezzoKey } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG, Q_PREVENTIVI_MEZZO, Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";

/** Link alla pagina Lavorazioni con focus sulla riga (attiva o storico). */
export function buildPreventiviLavorazioneFocusHref(lavorazioneId: string, origine: PreventivoLavorazioneOrigine): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, lavorazioneId);
  sp.set(Q_FOCUS_LAV_TARGET, origine);
  return `/lavorazioni?${sp.toString()}`;
}

/** Link all'archivio Preventivi filtrato per lavorazione. */
export function buildPreventiviArchivioFilterHref(lavorazioneId: string, origine: PreventivoLavorazioneOrigine): string {
  const sp = new URLSearchParams();
  sp.set(Q_PREVENTIVI_LAV, lavorazioneId);
  sp.set(Q_PREVENTIVI_LAV_ORIG, origine);
  return `/preventivi?${sp.toString()}`;
}

/** Id query `prevMezzo` per filtrare tutti i preventivi della stessa macchina. */
export function preventiviMezzoFilterId(lav: LavorazioneAttiva | LavorazioneArchiviata, mezzo: MezzoGestito | null): string {
  if (mezzo?.id?.trim()) return mezzo.id.trim();
  const nt = normMezzoKey(lav.targa);
  if (nt && nt !== "—") return `t:${nt}`;
  const nm = normMezzoKey(lav.matricola);
  if (nm && nm !== "—") return `m:${nm}`;
  return `hub-lav-${lav.id}`;
}

/** Pagina Preventivi: filtro macchina + apertura/evidenziazione del preventivo selezionato. */
export function buildPreventiviMacchinaOpenHref(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
  preventivoId: string,
): string {
  const sp = new URLSearchParams();
  sp.set(Q_PREVENTIVI_MEZZO, preventiviMezzoFilterId(lav, mezzo));
  sp.set(Q_PREVENTIVI_OPEN, preventivoId.trim());
  return `/preventivi?${sp.toString()}`;
}
