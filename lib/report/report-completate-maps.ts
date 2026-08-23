import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { monthKeyFromIso } from "@/lib/report/month-keys";
export function weekIndexInMonthFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  return Math.min(5, Math.ceil(day / 7));
}

export function weekMapKey(monthKeyStr: string, weekIndex: number): string {
  return `${monthKeyStr}#${weekIndex}`;
}

export function mergeManualMonthMap(db: Map<string, number>, manualByMonth?: Map<string, number>): Map<string, number> {
  const merged = new Map(db);
  if (!manualByMonth) return merged;
  for (const [k, v] of manualByMonth) {
    // ponytail: 0 manuale = assenza override (allineato a resolveReportMonthCompletedCount)
    if (v !== 0) merged.set(k, v);
  }
  return merged;
}

export function buildCompletateDbMaps(completate: LavorazioneArchiviata[]): {
  byMonth: Map<string, number>;
  byWeek: Map<string, number>;
} {
  const byMonth = new Map<string, number>();
  const byWeek = new Map<string, number>();

  for (const x of completate) {
    const mk = reportMonthKeyFromArchiviata(x);
    if (!mk) continue;
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);

    const wi = x.dataCompletamento ? weekIndexInMonthFromIso(x.dataCompletamento) : null;
    if (wi == null) continue;
    const wk = weekMapKey(mk, wi);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }

  return { byMonth, byWeek };
}

export function isReportManualMonthOverride(manual: Map<string, number>, monthKey: string): boolean {
  if (!manual.has(monthKey)) return false;
  return manual.get(monthKey)! !== 0;
}

export function resolveReportMonthCompletedCount(
  monthKey: string,
  db: Map<string, number>,
  manual?: Map<string, number>,
): number {
  const manualVal = manual?.get(monthKey);
  if (manualVal !== undefined && manualVal !== 0) return manualVal;
  return db.get(monthKey) ?? 0;
}

export function reportMonthKeyFromArchiviata(
  row: Pick<LavorazioneArchiviata, "dataCompletamento" | "meseCompletamento">,
): string {
  if (row.meseCompletamento?.trim()) return row.meseCompletamento.trim().slice(0, 7);
  return monthKeyFromIso(row.dataCompletamento) ?? "";
}
