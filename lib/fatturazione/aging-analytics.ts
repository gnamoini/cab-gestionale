import { openItemAgingBucket, openItemDaysOverdue } from "./open-items";
import type { CustomerOpenItemRow } from "@/src/types/supabase-tables";

export type AgingSummary = Record<"0-30" | "31-60" | "61-90" | "90+", { count: number; total: number }>;

export function buildAgingSummary(items: CustomerOpenItemRow[], today = new Date()): AgingSummary {
  const base: AgingSummary = {
    "0-30": { count: 0, total: 0 },
    "31-60": { count: 0, total: 0 },
    "61-90": { count: 0, total: 0 },
    "90+": { count: 0, total: 0 },
  };
  for (const item of items) {
    if (item.remaining_signed >= 0 || item.status === "closed") continue;
    const bucket = openItemAgingBucket(item.due_date, today);
    if (!bucket) continue;
    base[bucket].count += 1;
    base[bucket].total += Math.abs(item.remaining_signed);
  }
  return base;
}

export function scadenziarioDebitItems(items: CustomerOpenItemRow[]): CustomerOpenItemRow[] {
  return items.filter((i) => i.status !== "closed" && i.remaining_signed < 0);
}

export { openItemDaysOverdue };
