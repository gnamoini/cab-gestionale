import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { monthKeyFromIso } from "@/lib/report/month-keys";

/** Settimana calendario nel mese: 1 = giorni 1–7, 2 = 8–14, … */
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
  for (const [k, v] of manualByMonth) merged.set(k, v);
  return merged;
}

export function buildCompletateDbMaps(completate: LavorazioneArchiviata[]): {
  byMonth: Map<string, number>;
  byWeek: Map<string, number>;
} {
  const byMonth = new Map<string, number>();
  const byWeek = new Map<string, number>();

  for (const x of completate) {
    if (!x.dataCompletamento) continue;
    const mk = monthKeyFromIso(x.dataCompletamento);
    if (!mk) continue;
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);

    const wi = weekIndexInMonthFromIso(x.dataCompletamento);
    if (wi == null) continue;
    const wk = weekMapKey(mk, wi);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }

  return { byMonth, byWeek };
}
