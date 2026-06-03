import type { DateRange } from "@/lib/report/date-ranges";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

/** ISO datetime → chiave `YYYY-MM`. */
export function monthKeyFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Chiave mese da anno + indice 0-based. */
export function ymKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

/** Mesi `YYYY-MM` che intersecano il periodo (inclusivi). */
export function monthKeysOverlappingRange(range: DateRange): string[] {
  const out: string[] = [];
  const cur = startOfLocalDay(new Date(range.start.getFullYear(), range.start.getMonth(), 1));
  const end = endOfLocalDay(new Date(range.end.getFullYear(), range.end.getMonth(), 1));
  while (cur.getTime() <= end.getTime()) {
    out.push(ymKey(cur.getFullYear(), cur.getMonth()));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
