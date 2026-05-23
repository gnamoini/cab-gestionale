import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { buildStatiLavorazioniOptions } from "@/src/shared/selectors/lavorazioni-stati-db";
import {
  CLIENT_PORTAL_FALLBACK_STATO,
  resolveStatoId,
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

export function resolveClientPortalStatoId(
  stato: string,
  stati: StatoLavorazioneConfig[],
): string {
  return resolveStatoId(stato, stati, CLIENT_PORTAL_FALLBACK_STATO);
}

export function sanitizeClientLavorazioneRow(
  row: LavorazioneListRow,
  stati: StatoLavorazioneConfig[],
): LavorazioneListRow {
  const resolved = resolveClientPortalStatoId(row.stato, stati);
  return resolved === row.stato ? row : { ...row, stato: resolved };
}

/** Portale clienti: riga in tabella archivio (archiviazione manuale). */
export function isClientPortalArchivedRow(row: LavorazioneListRow): boolean {
  return row.archived === true;
}

/** Portale clienti: riga in tabella attive (non ancora archiviata). */
export function isClientPortalInCorsoRow(row: LavorazioneListRow): boolean {
  return row.archived !== true;
}

export function isClientPortalOpenStato(stato: string, stati: StatoLavorazioneConfig[]): boolean {
  const id = resolveStatoId(stato, stati);
  const closed = buildClientPortalClosedStatiSet(stati);
  return !closed.has(id);
}

export function resolveClientPortalStatoLabel(
  statoId: string,
  statiOpts: StatoLavorazioneConfig[],
): string {
  return statoLavorazioneLabel(statoId, statiOpts);
}
