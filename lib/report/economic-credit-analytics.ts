import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isClosedCustomerDecision, isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { buildInvoicePeriodKpi } from "@/lib/report/report-domain-analytics";

export type ArAgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export type ArAgingPoint = { label: string; value: number };

function agingBucketForInvoice(inv: InvoiceRow, todayYmd: string): ArAgingBucket | null {
  if (inv.residuo <= 0 || inv.status === "annullata") return null;
  const due = inv.data_scadenza ?? inv.data_emissione;
  if (!due) return "0-30";
  const days = Math.floor(
    (new Date(todayYmd).getTime() - new Date(due).getTime()) / 86400000,
  );
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

/** AR aging su residui aperti (€ per fascia giorni da scadenza). */
export function buildInvoiceArAgingPoints(invoices: readonly InvoiceRow[], today = new Date()): ArAgingPoint[] {
  const todayYmd = today.toISOString().slice(0, 10);
  const totals: Record<ArAgingBucket, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const inv of invoices) {
    const bucket = agingBucketForInvoice(inv, todayYmd);
    if (!bucket) continue;
    totals[bucket] = roundMoney(totals[bucket] + inv.residuo);
  }
  return [
    { label: "0–30 gg", value: totals["0-30"] },
    { label: "31–60 gg", value: totals["31-60"] },
    { label: "61–90 gg", value: totals["61-90"] },
    { label: "90+ gg", value: totals["90+"] },
  ];
}

/** DSO stimato: (crediti aperti / fatturato periodo) × giorni periodo. */
export function computeDsoDays(invoices: readonly InvoiceRow[], range: DateRange): number | null {
  const inv = buildInvoicePeriodKpi(invoices, range);
  if (inv.fatturato <= 0 || inv.daIncassare <= 0) return null;
  const days = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
  );
  return Math.round((inv.daIncassare / inv.fatturato) * days);
}

/** Win rate preventivi nel periodo: accettati / decisioni cliente chiuse (accettato+rifiutato). */
export function computePreventiviWinRate(preventivi: readonly PreventivoRecord[], range: DateRange): number | null {
  let total = 0;
  let won = 0;
  for (const p of preventivi) {
    if (p.statoWorkflow === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    if (!isClosedCustomerDecision(p)) continue;
    total += 1;
    if (isPreventivoCountedInEconomicStats(p)) won += 1;
  }
  if (total === 0) return null;
  return Math.round((won / total) * 1000) / 10;
}
