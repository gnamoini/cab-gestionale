import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

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
    .map((row) => preventivoRowToRecord(row, mezziById.get(row.mezzo_id) ?? null))
    .sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());
}

export function getPreventiviRecordsFromCache(
  qc: QueryClient,
  mezziRows: readonly MezzoRow[],
): PreventivoRecord[] {
  const rows = qc.getQueryData<PreventivoRow[]>([...QK.preventivi, null]);
  return mapPreventiviRowsToRecords(rows, mezziRows);
}
