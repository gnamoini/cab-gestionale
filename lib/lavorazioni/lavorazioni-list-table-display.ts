import { durataMsStorico } from "@/lib/lavorazioni/duration";
import { lavorazioneIngressoIso } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function lavorazioneDataCompletamentoIso(row: LavorazioneListRow): string {
  return (row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at) as string;
}

function formatOreSchedaTotali(ore: number): string {
  const h = Math.floor(ore);
  const m = Math.round((ore - h) * 60);
  if (h <= 0 && m <= 0) return "—";
  if (m <= 0) return `${h}h`;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

/** Somma ore impiegate dalla scheda lavorazioni (addetti × ore per riga). */
export function lavorazioneOreTotaliSchedaValue(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): number | null {
  const bundle = schedeStore?.[row.id];
  if (!bundle) return null;
  const ore = oreTotaliFromBundleLavorazioni(bundle);
  if (ore == null || ore <= 0) return null;
  return ore;
}

export function lavorazioneOreTotaliSchedaLabel(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const ore = lavorazioneOreTotaliSchedaValue(row, schedeStore);
  if (ore == null) return "—";
  return formatOreSchedaTotali(ore);
}

/** Permanenza tra ingresso e completamento/archivio. */
export function lavorazionePermanenzaFineIso(row: LavorazioneListRow): string {
  const closed = row.archived_at?.trim() || row.data_uscita?.trim();
  if (closed) return closed;
  return new Date().toISOString();
}

/** Permanenza tra ingresso e completamento/archivio. */
export function lavorazionePermanenzaGiorniLabel(
  row: LavorazioneListRow,
  schedaDataIngresso?: string | null,
): string {
  const ingresso = lavorazioneIngressoIso(row, schedaDataIngresso);
  const fine = lavorazionePermanenzaFineIso(row);
  const ms = durataMsStorico(ingresso, fine);
  if (ms <= 0) return "—";
  const g = ms / 86400000;
  const rounded = Math.round(g * 10) / 10;
  if (rounded === 0) return "< 1 giorno";
  if (rounded === 1) return "1 giorno";
  return `${rounded} giorni`;
}

export function lavorazioneOreLavoroSortValue(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): number {
  return lavorazioneOreTotaliSchedaValue(row, schedeStore) ?? -1;
}
