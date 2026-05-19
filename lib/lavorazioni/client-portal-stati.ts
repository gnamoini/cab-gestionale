import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { buildStatiLavorazioniOptions } from "@/src/shared/selectors/lavorazioni-stati-db";
import {
  CLIENT_PORTAL_FALLBACK_STATO,
  migrateStatoConfigId,
  resolveStatoId,
  statiInCorsoFromConfig,
  STATO_LAVORAZIONE_COMPLETATA_ID,
  statoLavorazioneLabel,
} from "@/lib/lavorazioni/stati-dynamic";

/** Stati chiusi (config). */
export function buildClientPortalClosedStatiSet(stati: StatoLavorazioneConfig[]): Set<string> {
  return new Set(stati.filter((s) => s.closed === true).map((s) => s.id));
}

/** Opzioni stato per UI portale. */
export function filterClientPortalStatiOptions(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): StatoLavorazioneConfig[] {
  return buildStatiLavorazioniOptions(settingsStati);
}

/** @deprecated Usare split su `row.archived`. */
export function buildClientPortalVisibleStatiSet(
  settingsStati: StatoLavorazioneConfig[] | undefined,
): Set<string> {
  const stati = buildStatiLavorazioniOptions(settingsStati);
  const configured = statiInCorsoFromConfig(stati);
  const set = new Set(configured.map((s) => s.id));
  set.add(STATO_LAVORAZIONE_COMPLETATA_ID);
  return set;
}

export function sanitizeClientLavorazioneRow(
  row: LavorazioneListRow,
  stati: StatoLavorazioneConfig[],
): LavorazioneListRow {
  const resolved = resolveStatoId(row.stato, stati, CLIENT_PORTAL_FALLBACK_STATO);
  return resolved === row.stato ? row : { ...row, stato: resolved };
}

export function isClientPortalExcludedStato(stato: string): boolean {
  return migrateStatoConfigId(stato.trim()) === "annullata";
}

export function isClientPortalCompletataStato(stato: string): boolean {
  return migrateStatoConfigId(stato.trim()) === STATO_LAVORAZIONE_COMPLETATA_ID;
}

/** Portale clienti: riga in tabella archivio (archiviazione manuale). */
export function isClientPortalArchivedRow(row: LavorazioneListRow): boolean {
  return row.archived === true;
}

/** Portale clienti: riga in tabella attive (non ancora archiviata). */
export function isClientPortalInCorsoRow(row: LavorazioneListRow): boolean {
  return row.archived !== true;
}

/** @deprecated Usare isClientPortalArchivedRow. */
export function isClientPortalArchiveRow(row: LavorazioneListRow, _stati: StatoLavorazioneConfig[]): boolean {
  return isClientPortalArchivedRow(row);
}

/** @deprecated Usare isClientPortalInCorsoRow. */
export function isClientPortalVisibleRow(
  row: LavorazioneListRow,
  visibleStati: Set<string>,
  stati: StatoLavorazioneConfig[],
): boolean {
  if (isClientPortalArchivedRow(row)) return false;
  if (isClientPortalExcludedStato(row.stato)) return false;
  const stato = resolveStatoId(row.stato, stati);
  if (visibleStati.size === 0) return true;
  return visibleStati.has(stato);
}

export function isClientPortalOpenStato(stato: string, stati: StatoLavorazioneConfig[]): boolean {
  const id = migrateStatoConfigId(stato);
  const closed = buildClientPortalClosedStatiSet(stati);
  return !closed.has(id);
}

export function buildQuerySafeStatiIn(settingsStati: StatoLavorazioneConfig[] | undefined): string[] {
  const stati = buildStatiLavorazioniOptions(settingsStati);
  const ids = statiInCorsoFromConfig(stati).map((s) => s.id);
  const uniq = [...new Set(ids)];
  if (!uniq.includes(STATO_LAVORAZIONE_COMPLETATA_ID)) uniq.push(STATO_LAVORAZIONE_COMPLETATA_ID);
  return uniq.length ? uniq : [CLIENT_PORTAL_FALLBACK_STATO, STATO_LAVORAZIONE_COMPLETATA_ID];
}

export function resolveClientPortalStatoLabel(
  statoId: string,
  statiOpts: StatoLavorazioneConfig[],
): string {
  return statoLavorazioneLabel(statoId, statiOpts);
}
