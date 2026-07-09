import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { InvoiceRow } from "@/src/types/supabase-tables";

export type InvoiceMonthPoint = { label: string; value: number };

export function aggregateInvoicesByMonth(
  invoices: readonly InvoiceRow[],
  range: DateRange,
): InvoiceMonthPoint[] {
  const byMonth = new Map<string, number>();
  const start = range.start;
  const end = range.end;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const inv of invoices) {
    if (inv.status === "annullata" || inv.status === "bozza" || inv.status === "da_verificare") continue;
    if (!isoInRange(inv.data_emissione, range)) continue;
    const key = inv.data_emissione.slice(0, 7);
    if (!byMonth.has(key)) continue;
    byMonth.set(key, (byMonth.get(key) ?? 0) + inv.totale);
  }

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return [...byMonth.entries()].map(([ym, value]) => {
    const monthIdx = Number(ym.slice(5, 7)) - 1;
    const yy = ym.slice(2, 4);
    return { label: `${months[monthIdx] ?? ym} '${yy}`, value: Math.round(value) };
  });
}
