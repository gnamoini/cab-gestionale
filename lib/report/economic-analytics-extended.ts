import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { InvoiceLineRow, InvoicePaymentRow, InvoiceRow, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

export type InvoicePeriodKpiExtended = {
  emesse: number;
  fatturato: number;
  incassato: number;
  scadute: number;
  importoScaduto: number;
  daIncassare: number;
};

export type RevenueMonthPoint = { monthKey: string; label: string; fatturato: number; incassato: number };

export type PreventiviFunnelRow = { id: string; label: string; count: number; value: number };

export type RevenueMixSlice = { id: string; label: string; value: number };

export type MarginWaterfallStep = { id: string; label: string; value: number; kind: "total" | "decrease" | "result" };

export type ClienteAgingHeatmapRow = {
  cliente: string;
  buckets: Record<"0-30" | "31-60" | "61-90" | "90+", number>;
  total: number;
};

export type ScadutoClienteRow = { cliente: string; count: number; importo: number };

export type PreventivoConsuntivoRow = {
  preventivoId: string;
  label: string;
  preventivo: number;
  consuntivo: number;
  delta: number;
  deltaPct: number | null;
};

export type CostiMensiliPoint = { monthKey: string; label: string; ricambi: number; manodopera: number };

export type IncassoForecastPoint = { monthKey: string; label: string; previsto: number };

export type MezzoRedditivitaRow = {
  mezzoId: string;
  label: string;
  costo: number;
  ricavi: number;
  margine: number;
};

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

function monthLabel(ym: string): string {
  const monthIdx = Number(ym.slice(5, 7)) - 1;
  const yy = ym.slice(2, 4);
  return `${MONTHS[monthIdx] ?? ym} '${yy}`;
}

function monthKeysInRange(range: DateRange): string[] {
  const keys: string[] = [];
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (cursor <= endMonth) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function agingBucket(days: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function isEmittedInvoice(inv: InvoiceRow): boolean {
  return inv.status !== "annullata" && inv.status !== "bozza" && inv.status !== "da_verificare";
}

export function buildInvoicePeriodKpiExtended(
  invoices: readonly InvoiceRow[],
  payments: readonly InvoicePaymentRow[],
  range: DateRange,
): InvoicePeriodKpiExtended {
  const todayYmd = new Date().toISOString().slice(0, 10);
  let emesse = 0;
  let fatturato = 0;
  let scadute = 0;
  let importoScaduto = 0;
  let daIncassare = 0;

  for (const inv of invoices) {
    if (inv.status === "annullata") continue;
    if (isEmittedInvoice(inv) && isoInRange(inv.data_emissione, range)) {
      emesse += 1;
      fatturato = roundMoney(fatturato + inv.totale);
    }
    if (inv.residuo > 0) {
      daIncassare = roundMoney(daIncassare + inv.residuo);
      if (inv.data_scadenza != null && inv.data_scadenza < todayYmd) {
        scadute += 1;
        importoScaduto = roundMoney(importoScaduto + inv.residuo);
      }
    }
  }

  let incassato = 0;
  if (payments.length > 0) {
    for (const p of payments) {
      if (!isoInRange(p.data, range)) continue;
      incassato = roundMoney(incassato + p.importo);
    }
  } else {
    for (const inv of invoices) {
      if (inv.status === "annullata" || inv.status !== "pagata") continue;
      if (!isoInRange(inv.updated_at, range)) continue;
      incassato = roundMoney(incassato + (inv.pagato > 0 ? inv.pagato : inv.totale));
    }
  }

  return { emesse, fatturato, incassato, scadute, importoScaduto, daIncassare };
}

export function buildRevenueCollectionMonthlySeries(
  invoices: readonly InvoiceRow[],
  payments: readonly InvoicePaymentRow[],
  range: DateRange,
): RevenueMonthPoint[] {
  const byMonth = new Map<string, { fatturato: number; incassato: number }>();
  for (const key of monthKeysInRange(range)) byMonth.set(key, { fatturato: 0, incassato: 0 });

  for (const inv of invoices) {
    if (!isEmittedInvoice(inv) || !isoInRange(inv.data_emissione, range)) continue;
    const key = inv.data_emissione.slice(0, 7);
    const cur = byMonth.get(key);
    if (!cur) continue;
    cur.fatturato = roundMoney(cur.fatturato + inv.totale);
  }

  if (payments.length > 0) {
    for (const p of payments) {
      if (!isoInRange(p.data, range)) continue;
      const key = p.data.slice(0, 7);
      const cur = byMonth.get(key);
      if (!cur) continue;
      cur.incassato = roundMoney(cur.incassato + p.importo);
    }
  } else {
    for (const inv of invoices) {
      if (inv.status !== "pagata") continue;
      if (!isoInRange(inv.updated_at, range)) continue;
      const key = inv.updated_at.slice(0, 7);
      const cur = byMonth.get(key);
      if (!cur) continue;
      cur.incassato = roundMoney(cur.incassato + (inv.pagato > 0 ? inv.pagato : inv.totale));
    }
  }

  return [...byMonth.entries()].map(([monthKey, v]) => ({
    monthKey,
    label: monthLabel(monthKey),
    fatturato: v.fatturato,
    incassato: v.incassato,
  }));
}

const PREVENTIVO_STATE_LABELS: Record<string, string> = {
  inviato: "Inviati",
  confermato: "Confermati",
  annullato: "Annullati",
  scaduto: "Scaduti",
};

export function buildPreventiviFunnel(
  preventivi: readonly PreventivoRecord[],
  range: DateRange,
): PreventiviFunnelRow[] {
  const buckets = new Map<string, { count: number; value: number }>();
  for (const p of preventivi) {
    if (p.stato === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    const key = p.stato;
    const cur = buckets.get(key) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value = roundMoney(cur.value + (p.totaleFinale ?? 0));
    buckets.set(key, cur);
  }
  const order = ["inviato", "confermato", "annullato", "scaduto"];
  return order
    .filter((id) => buckets.has(id))
    .map((id) => {
      const v = buckets.get(id)!;
      return { id, label: PREVENTIVO_STATE_LABELS[id] ?? id, count: v.count, value: v.value };
    });
}

const MIX_LABELS: Record<InvoiceLineRow["tipo"], string> = {
  ricambio: "Ricambi",
  articolo_magazzino: "Magazzino",
  manodopera: "Manodopera",
  lavorazione: "Lavorazioni",
  costo_extra: "Extra",
  libera: "Altro",
};

export function buildRevenueMixByType(
  invoiceLines: readonly InvoiceLineRow[],
  invoices: readonly InvoiceRow[],
  range: DateRange,
): RevenueMixSlice[] {
  const emitted = new Set(
    invoices.filter((inv) => isEmittedInvoice(inv) && isoInRange(inv.data_emissione, range)).map((inv) => inv.id),
  );
  const totals = new Map<string, number>();
  for (const line of invoiceLines) {
    if (!emitted.has(line.invoice_id)) continue;
    const label = MIX_LABELS[line.tipo] ?? line.tipo;
    totals.set(label, roundMoney((totals.get(label) ?? 0) + line.totale));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ id: label, label, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function buildMarginWaterfall(
  fatturato: number,
  manodopera: number,
  ricambi: number,
): MarginWaterfallStep[] {
  if (fatturato <= 0) return [];
  const costi = roundMoney(manodopera + ricambi);
  const margine = roundMoney(fatturato - costi);
  return [
    { id: "fatturato", label: "Fatturato", value: fatturato, kind: "total" },
    { id: "manodopera", label: "Manodopera", value: -manodopera, kind: "decrease" },
    { id: "ricambi", label: "Ricambi", value: -ricambi, kind: "decrease" },
    { id: "margine", label: "Margine stimato", value: margine, kind: "result" },
  ];
}

export function buildResiduoDaFatturare(
  billingRows: readonly PreventivoBillingStatusRow[],
): number {
  let sum = 0;
  for (const row of billingRows) {
    if (row.residuo <= 0) continue;
    sum = roundMoney(sum + row.residuo);
  }
  return sum;
}

export function buildTopClientiFatturatoEnriched(
  invoices: readonly InvoiceRow[],
  range: DateRange,
  limit = 10,
): Array<{ rank: number; cliente: string; fatturato: number; fatture: number; pct: number; crediti: number }> {
  const map = new Map<string, { fatturato: number; fatture: number; crediti: number }>();
  let totalFatturato = 0;

  for (const inv of invoices) {
    if (!isEmittedInvoice(inv)) continue;
    const cliente = inv.cliente_label.trim() || "—";
    const cur = map.get(cliente) ?? { fatturato: 0, fatture: 0, crediti: 0 };
    if (isoInRange(inv.data_emissione, range)) {
      cur.fatture += 1;
      cur.fatturato = roundMoney(cur.fatturato + inv.totale);
      totalFatturato = roundMoney(totalFatturato + inv.totale);
    }
    if (inv.residuo > 0) cur.crediti = roundMoney(cur.crediti + inv.residuo);
    map.set(cliente, cur);
  }

  const rows = [...map.entries()]
    .filter(([, v]) => v.fatturato > 0)
    .map(([cliente, v]) => ({
      cliente,
      fatturato: v.fatturato,
      fatture: v.fatture,
      crediti: v.crediti,
      pct: totalFatturato > 0 ? Math.round((v.fatturato / totalFatturato) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, limit);

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function buildClienteAgingHeatmap(
  invoices: readonly InvoiceRow[],
  today = new Date(),
): ClienteAgingHeatmapRow[] {
  const todayYmd = today.toISOString().slice(0, 10);
  const map = new Map<string, ClienteAgingHeatmapRow>();

  for (const inv of invoices) {
    if (inv.residuo <= 0 || inv.status === "annullata") continue;
    const cliente = inv.cliente_label.trim() || "—";
    const due = inv.data_scadenza ?? inv.data_emissione;
    const days = due
      ? Math.floor((new Date(todayYmd).getTime() - new Date(due).getTime()) / 86400000)
      : 0;
    const bucket = agingBucket(Math.max(0, days));
    const row = map.get(cliente) ?? {
      cliente,
      buckets: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      total: 0,
    };
    row.buckets[bucket] = roundMoney(row.buckets[bucket] + inv.residuo);
    row.total = roundMoney(row.total + inv.residuo);
    map.set(cliente, row);
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
}

export function buildScadutiByCliente(invoices: readonly InvoiceRow[]): ScadutoClienteRow[] {
  const todayYmd = new Date().toISOString().slice(0, 10);
  const map = new Map<string, ScadutoClienteRow>();
  for (const inv of invoices) {
    if (inv.residuo <= 0 || inv.status === "annullata") continue;
    if (inv.data_scadenza == null || inv.data_scadenza >= todayYmd) continue;
    const cliente = inv.cliente_label.trim() || "—";
    const cur = map.get(cliente) ?? { cliente, count: 0, importo: 0 };
    cur.count += 1;
    cur.importo = roundMoney(cur.importo + inv.residuo);
    map.set(cliente, cur);
  }
  return [...map.values()].sort((a, b) => b.importo - a.importo);
}

export function buildPreventivoVsConsuntivo(
  preventivi: readonly PreventivoRecord[],
  invoices: readonly InvoiceRow[],
  links: readonly { source_type: string; source_id: string; invoice_id: string; allocated_totale: number }[],
  range: DateRange,
  limit = 15,
): PreventivoConsuntivoRow[] {
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));
  const consuntivoByPreventivo = new Map<string, number>();

  for (const link of links) {
    if (link.source_type !== "preventivo") continue;
    const inv = invoiceById.get(link.invoice_id);
    if (!inv || !isEmittedInvoice(inv) || !isoInRange(inv.data_emissione, range)) continue;
    consuntivoByPreventivo.set(
      link.source_id,
      roundMoney((consuntivoByPreventivo.get(link.source_id) ?? 0) + link.allocated_totale),
    );
  }

  const rows: PreventivoConsuntivoRow[] = [];
  for (const p of preventivi) {
    if (p.stato === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    const consuntivo = consuntivoByPreventivo.get(p.id) ?? 0;
    if (consuntivo <= 0) continue;
    const preventivo = p.totaleFinale ?? 0;
    const delta = roundMoney(consuntivo - preventivo);
    const deltaPct = preventivo > 0 ? Math.round((delta / preventivo) * 1000) / 10 : null;
    rows.push({
      preventivoId: p.id,
      label: p.numero ? `Prev. ${p.numero}` : p.id.slice(0, 8),
      preventivo,
      consuntivo,
      delta,
      deltaPct,
    });
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}

export function buildIncassoForecast(invoices: readonly InvoiceRow[], today = new Date()): IncassoForecastPoint[] {
  const byMonth = new Map<string, number>();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let i = 0; i < 3; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, 0);
  }

  for (const inv of invoices) {
    if (inv.residuo <= 0 || inv.status === "annullata" || !inv.data_scadenza) continue;
    const key = inv.data_scadenza.slice(0, 7);
    if (!byMonth.has(key)) continue;
    byMonth.set(key, roundMoney((byMonth.get(key) ?? 0) + inv.residuo));
  }

  return [...byMonth.entries()].map(([monthKey, previsto]) => ({
    monthKey,
    label: monthLabel(monthKey),
    previsto,
  }));
}

export function computeTopClienteConcentration(
  invoices: readonly InvoiceRow[],
  range: DateRange,
): { cliente: string; sharePct: number } | null {
  const enriched = buildTopClientiFatturatoEnriched(invoices, range, 1);
  if (enriched.length === 0) return null;
  const top = enriched[0]!;
  return top.pct > 0 ? { cliente: top.cliente, sharePct: top.pct } : null;
}
