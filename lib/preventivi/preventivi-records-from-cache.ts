import type { PreventiviRecordsPayload } from "@/lib/preventivi/preventivi-list-fetch";
import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

const PREVENTIVI_RECORDS_KEY = [...QK.preventivi, null] as const;

/** Formato legacy annuale (2026-001 / PV-2026-012) — solo migrazione localStorage. */
export function nextPreventivoNumeroFromRecords(existing: readonly PreventivoRecord[]): string {
  const y = new Date().getFullYear();
  let max = 0;
  for (const p of existing) {
    const t = p.numero.trim();
    const mNew = /^(\d{4})-(\d+)$/.exec(t);
    const mLegacy = /^PV-(\d{4})-(\d+)$/.exec(t);
    let seq: number | null = null;
    let year: string | null = null;
    if (mNew) {
      year = mNew[1]!;
      seq = parseInt(mNew[2]!, 10);
    } else if (mLegacy) {
      year = mLegacy[1]!;
      seq = parseInt(mLegacy[2]!, 10);
    }
    if (year === String(y) && seq !== null) max = Math.max(max, seq);
  }
  return `${y}-${String(max + 1).padStart(3, "0")}`;
}

export function nextPreventivoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `prev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mapPreventiviRowsToRecords(
  remote: readonly PreventivoRow[] | undefined,
  mezziRows: readonly MezzoRow[],
): PreventivoRecord[] {
  const mezziById = new Map(mezziRows.map((m) => [m.id, m]));
  return (remote ?? [])
    .map((row) =>
      preventivoRowToRecord(row, row.mezzo_id ? mezziById.get(row.mezzo_id) ?? null : null),
    )
    .sort((a, b) => b.dataCreazione.localeCompare(a.dataCreazione));
}

export function getPreventiviRecordsFromCache(qc: QueryClient): PreventivoRecord[] {
  const payload = qc.getQueryData<PreventiviRecordsPayload>(PREVENTIVI_RECORDS_KEY);
  return payload?.records ?? [];
}

export function getPreventiviPayloadFromCache(qc: QueryClient): PreventiviRecordsPayload | undefined {
  return qc.getQueryData<PreventiviRecordsPayload>(PREVENTIVI_RECORDS_KEY);
}
