import { logAutoreLabel, type LogModificaAutoreSource } from "@/lib/gestionale-log/log-modifiche-view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { ricambioIdFromLogRow } from "@/lib/magazzino/ricambio-log-label";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type MagazzinoUltimaModificaInfo = {
  iso: string;
  autore: string;
};

export type BuildMagazzinoUltimaModificaFromLogsOptions = {
  currentUserId: string | null;
  currentDisplayName: string;
};

function mergeUltimaModificaCandidate(
  map: Map<string, MagazzinoUltimaModificaInfo>,
  ricambioId: string,
  candidate: MagazzinoUltimaModificaInfo,
): void {
  const id = ricambioId.trim();
  const iso = candidate.iso.trim();
  const autore = candidate.autore.trim();
  if (!id || !iso) return;
  const existing = map.get(id);
  if (!existing || iso.localeCompare(existing.iso) > 0) {
    map.set(id, { iso, autore: autore || existing?.autore || "" });
    return;
  }
  if (iso === existing.iso && autore && !existing.autore.trim()) {
    map.set(id, { ...existing, autore });
  }
}

/** SSOT audit: ultima modifica per ricambio da `log_modifiche` (magazzino + movimenti). */
export function buildUltimaModificaByRicambioIdFromLogs(
  rows: readonly LogModificaAutoreSource[],
  options: BuildMagazzinoUltimaModificaFromLogsOptions,
): Map<string, MagazzinoUltimaModificaInfo> {
  const map = new Map<string, MagazzinoUltimaModificaInfo>();
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const row of sorted) {
    if (isLogReverted(row)) continue;
    const ricambioId = ricambioIdFromLogRow(row);
    if (!ricambioId) continue;
    mergeUltimaModificaCandidate(map, ricambioId, {
      iso: row.created_at,
      autore: logAutoreLabel(row, options.currentUserId, options.currentDisplayName),
    });
  }
  return map;
}

export function buildUltimaModificaByRicambioIdFromLocalEntries(
  entries: readonly MagazzinoChangeLogEntry[],
): Map<string, MagazzinoUltimaModificaInfo> {
  const map = new Map<string, MagazzinoUltimaModificaInfo>();
  for (const entry of entries) {
    if (entry.annullato) continue;
    mergeUltimaModificaCandidate(map, entry.ricambioId, {
      iso: entry.at,
      autore: entry.autore,
    });
  }
  return map;
}

function rowUltimaModificaCandidate(ricambio: RicambioMagazzino): MagazzinoUltimaModificaInfo | null {
  const iso = ricambio.dataUltimaModifica?.trim() ?? "";
  if (!iso) return null;
  const autore = ricambio.autoreUltimaModifica.trim();
  return {
    iso,
    autore: autore && autore !== "Sistema" ? autore : "",
  };
}

/** Preferisce la fonte più recente: log locale → log server → meta riga. */
export function resolveMagazzinoUltimaModifica(
  ricambio: RicambioMagazzino,
  fromLogs: ReadonlyMap<string, MagazzinoUltimaModificaInfo>,
  fromLocal?: ReadonlyMap<string, MagazzinoUltimaModificaInfo>,
): MagazzinoUltimaModificaInfo {
  const candidates: MagazzinoUltimaModificaInfo[] = [];
  const local = fromLocal?.get(ricambio.id);
  if (local?.iso) candidates.push(local);
  const fromLog = fromLogs.get(ricambio.id);
  if (fromLog?.iso) candidates.push(fromLog);
  const fromRow = rowUltimaModificaCandidate(ricambio);
  if (fromRow?.iso) candidates.push(fromRow);

  candidates.sort((a, b) => b.iso.localeCompare(a.iso));
  const best = candidates[0];
  if (!best?.iso) return { iso: "", autore: "—" };
  return { iso: best.iso, autore: best.autore.trim() || "—" };
}

export function enrichRicambiMagazzinoUltimaModifica(
  ricambi: readonly RicambioMagazzino[],
  fromLogs: ReadonlyMap<string, MagazzinoUltimaModificaInfo>,
  fromLocal?: ReadonlyMap<string, MagazzinoUltimaModificaInfo>,
): RicambioMagazzino[] {
  return ricambi.map((ricambio) => {
    const info = resolveMagazzinoUltimaModifica(ricambio, fromLogs, fromLocal);
    if (info.iso === ricambio.dataUltimaModifica && info.autore === ricambio.autoreUltimaModifica) {
      return ricambio;
    }
    return {
      ...ricambio,
      dataUltimaModifica: info.iso || ricambio.dataUltimaModifica,
      autoreUltimaModifica: info.autore,
    };
  });
}
