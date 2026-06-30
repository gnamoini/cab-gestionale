import type { InvoiceDraftRowInput, InvoiceKpi } from "@/lib/fatturazione/types";
import type { InvoiceRow, InvoiceStatus, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "bozza",
  "da_verificare",
  "emessa",
  "inviata",
  "parzialmente_pagata",
  "pagata",
  "scaduta",
  "annullata",
] as const;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceRowTotals(row: InvoiceDraftRowInput): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  const quantita = Math.max(0, Number(row.quantita) || 0);
  const prezzo = Math.max(0, Number(row.prezzo_unitario) || 0);
  const sconto = Math.min(100, Math.max(0, Number(row.sconto_percent ?? 0) || 0));
  const ivaPercent = Math.max(0, Number(row.iva_percent ?? 22) || 0);
  const imponibile = roundMoney(quantita * prezzo * (1 - sconto / 100));
  const iva = roundMoney(imponibile * (ivaPercent / 100));
  return { imponibile, iva, totale: roundMoney(imponibile + iva) };
}

export function calculateInvoiceTotals(rows: readonly InvoiceDraftRowInput[]): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  return rows.reduce(
    (acc, row) => {
      const t = calculateInvoiceRowTotals(row);
      return {
        imponibile: roundMoney(acc.imponibile + t.imponibile),
        iva: roundMoney(acc.iva + t.iva),
        totale: roundMoney(acc.totale + t.totale),
      };
    },
    { imponibile: 0, iva: 0, totale: 0 },
  );
}

export function resolvePaymentStatus(input: {
  currentStatus: InvoiceStatus;
  totale: number;
  pagato: number;
  dataScadenza?: string | null;
  today?: string;
}): InvoiceStatus {
  if (input.currentStatus === "annullata" || input.currentStatus === "bozza" || input.currentStatus === "da_verificare") {
    return input.currentStatus;
  }
  const residuo = roundMoney(input.totale - input.pagato);
  if (input.totale > 0 && residuo <= 0) return "pagata";
  if (input.pagato > 0) return "parzialmente_pagata";
  if (input.dataScadenza && input.dataScadenza < (input.today ?? new Date().toISOString().slice(0, 10))) return "scaduta";
  return input.currentStatus;
}

export function resolvePreventivoBillingStatus(input: {
  totale: number;
  fatturato: number;
}): PreventivoBillingStatusRow["stato_fatturazione"] {
  if (input.fatturato <= 0) return "non_fatturato";
  if (roundMoney(input.fatturato) < roundMoney(input.totale)) return "parzialmente_fatturato";
  return "totalmente_fatturato";
}

export function assertNoPreventivoOverbilling(input: {
  preventivoTotale: number;
  giaFatturato: number;
  nuovaAllocazione: number;
}): { ok: true } | { ok: false; message: string } {
  const totale = roundMoney(input.preventivoTotale);
  const next = roundMoney(input.giaFatturato + input.nuovaAllocazione);
  if (next > totale) return { ok: false, message: "Importo fatturato superiore al residuo del preventivo." };
  return { ok: true };
}

export function buildInvoiceKpi(invoices: readonly InvoiceRow[], today = new Date()): InvoiceKpi {
  const y = today.getFullYear();
  const m = today.getMonth();
  const monthStart = new Date(y, m, 1).toISOString().slice(0, 10);
  const nextMonth = new Date(y, m + 1, 1).toISOString().slice(0, 10);
  const yearStart = new Date(y, 0, 1).toISOString().slice(0, 10);
  const nextYear = new Date(y + 1, 0, 1).toISOString().slice(0, 10);
  const todayYmd = today.toISOString().slice(0, 10);

  const active = invoices.filter((i) => i.status !== "annullata");
  const month = active.filter((i) => i.data_emissione >= monthStart && i.data_emissione < nextMonth);
  const yearRows = active.filter((i) => i.data_emissione >= yearStart && i.data_emissione < nextYear);
  const overdue = active.filter((i) => i.residuo > 0 && i.data_scadenza != null && i.data_scadenza < todayYmd);

  return {
    emesseMese: month.filter((i) => i.status !== "bozza" && i.status !== "da_verificare").length,
    daIncassare: roundMoney(active.reduce((sum, i) => sum + i.residuo, 0)),
    scadute: overdue.length,
    fatturatoMese: roundMoney(month.reduce((sum, i) => sum + i.totale, 0)),
    fatturatoAnno: roundMoney(yearRows.reduce((sum, i) => sum + i.totale, 0)),
    clientiConInsoluti: new Set(overdue.map((i) => i.cliente_label.trim().toLowerCase()).filter(Boolean)).size,
  };
}
