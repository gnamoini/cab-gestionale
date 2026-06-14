import { formatTimestampHover } from "@/lib/lavorazioni/lavorazioni-change-log";
import {
  buildMezziGestionaleLogViewModel,
  buildModificaRigaFromChanges,
  stripAutoreFromRiepilogo,
} from "@/lib/gestionale-log/view-model";
import { filterAuditMetadataCampoChanges } from "@/lib/gestionale-log/log-summary";
import {
  logModificaRowToMezziHubLogEntry,
  type MezziHubLogEntryOptions,
} from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

export type MezzoUltimaModificaInfo = {
  iso: string;
  autore: string;
  summaryShort: string;
  summaryFull: string;
};

function mezzoLogEntryToInfo(entry: ReturnType<typeof logModificaRowToMezziHubLogEntry>): MezzoUltimaModificaInfo {
  const vm = buildMezziGestionaleLogViewModel(entry);
  const changes = filterAuditMetadataCampoChanges(entry.changes);

  let summaryShort: string;
  if (entry.tipo === "aggiunta") {
    summaryShort = "Anagrafica creata";
  } else if (entry.tipo === "rimozione") {
    summaryShort = "Mezzo eliminato";
  } else if (changes.length > 0) {
    const labels = changes.map((c) => c.campo);
    summaryShort = labels.length <= 2 ? labels.join(", ") : `${labels.slice(0, 2).join(", ")}…`;
  } else {
    const fb = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    summaryShort = fb || "Dati aggiornati";
    if (summaryShort.length > 52) summaryShort = `${summaryShort.slice(0, 49)}…`;
  }

  const summaryFull =
    entry.tipo === "update" && changes.length > 0
      ? buildModificaRigaFromChanges(entry.changes)
      : vm.modificaRiga;

  return {
    iso: entry.at,
    autore: entry.autore.trim(),
    summaryShort,
    summaryFull,
  };
}

/** Prima voce log per mezzo (lista ordinata `created_at` desc). */
export function buildUltimaModificaByMezzoIdFromLogs(
  rows: readonly (LogModificaRow | LogModificaWithProfileRow)[],
  options?: MezziHubLogEntryOptions,
): Map<string, MezzoUltimaModificaInfo> {
  const map = new Map<string, MezzoUltimaModificaInfo>();
  for (const row of rows) {
    const id = row.entita_id?.trim();
    if (!id || map.has(id)) continue;
    map.set(id, mezzoLogEntryToInfo(logModificaRowToMezziHubLogEntry(row, options)));
  }
  return map;
}

export function resolveMezzoUltimaModificaInfo(
  m: MezzoGestito,
  byMezzoId: ReadonlyMap<string, MezzoUltimaModificaInfo>,
): MezzoUltimaModificaInfo {
  const fromLog = byMezzoId.get(m.id);
  if (fromLog) return fromLog;
  const iso = m.ultimaModifica?.trim() ?? "";
  if (!iso) {
    return { iso: "", autore: "", summaryShort: "—", summaryFull: "Nessuna modifica registrata" };
  }
  return {
    iso,
    autore: "",
    summaryShort: "Anagrafica aggiornata",
    summaryFull: "Ultimo aggiornamento anagrafica (dettaglio non disponibile nella cronologia caricata)",
  };
}

export function formatMezzoUltimaModificaMobileDate(iso: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Card mobile: data e autore su due righe (come Lavorazioni/Magazzino). */
export function formatMezzoUltimaModificaMobileLines(info: MezzoUltimaModificaInfo): {
  date: string;
  autore: string;
} {
  const date = formatMezzoUltimaModificaMobileDate(info.iso);
  const autore = info.autore.trim() || "—";
  return { date, autore };
}

/** Tooltip card mobile: solo il testo descrittivo della modifica. */
export function formatMezzoUltimaModificaTooltip(info: MezzoUltimaModificaInfo): string | null {
  const detail = info.summaryFull?.trim();
  if (detail && detail !== "—") return detail;
  const short = info.summaryShort?.trim();
  if (short && short !== "—") return short;
  if (!info.iso?.trim()) return "Nessuna modifica registrata";
  return formatTimestampHover(info.iso);
}
