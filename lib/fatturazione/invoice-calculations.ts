import type { InvoiceDraftRowInput, InvoiceKpi } from "@/lib/fatturazione/types";
import { invoiceCountsAsValidlyIssued } from "@/lib/fatturazione/invoice-status";
import { calculateVatDocumentSummary, calculateVatLine, vatCodeListItemToConfiguration } from "@/lib/vat/vat-calculation";
import type { VatCodeListItem, VatConfiguration } from "@/lib/vat/types";
import { roundMoney } from "@/lib/vat/vat-rounding";
import type {
  InvoiceRow,
  InvoiceStatus,
  PreventivoBillingStatusRow,
} from "@/src/types/supabase-tables";

export { roundMoney } from "@/lib/vat/vat-rounding";

export function formatInvoiceMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value ?? 0);
}

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

export function resolveRowVatConfiguration(
  row: InvoiceDraftRowInput,
  vatCodes: readonly VatCodeListItem[],
): VatConfiguration {
  const match = vatCodes.find((c) => c.vat_code_id === row.vat_code_id);
  if (!match) {
    throw new Error("VAT_CODE_MISSING");
  }
  return vatCodeListItemToConfiguration(match);
}

export function calculateInvoiceRowTotals(
  row: InvoiceDraftRowInput,
  vatCodes: readonly VatCodeListItem[],
): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  const config = resolveRowVatConfiguration(row, vatCodes);
  const calc = calculateVatLine({
    configuration: config,
    quantita: row.quantita,
    prezzo_unitario: row.prezzo_unitario,
    sconto_percent: row.sconto_percent,
  });
  return {
    imponibile: calc.taxable_amount,
    iva: calc.vat_amount,
    totale: calc.gross_amount,
  };
}

export function calculateInvoiceTotals(
  rows: readonly InvoiceDraftRowInput[],
  vatCodes: readonly VatCodeListItem[],
): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  const calcs = rows.map((row) =>
    calculateVatLine({
      configuration: resolveRowVatConfiguration(row, vatCodes),
      quantita: row.quantita,
      prezzo_unitario: row.prezzo_unitario,
      sconto_percent: row.sconto_percent,
    }),
  );
  return calculateVatDocumentSummary(calcs);
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
  const billed = active.filter(invoiceCountsAsValidlyIssued);
  const month = active.filter((i) => i.data_emissione >= monthStart && i.data_emissione < nextMonth);
  const monthBilled = billed.filter((i) => i.data_emissione >= monthStart && i.data_emissione < nextMonth);
  const yearBilled = billed.filter((i) => i.data_emissione >= yearStart && i.data_emissione < nextYear);
  const overdue = billed.filter((i) => i.residuo > 0 && i.data_scadenza != null && i.data_scadenza < todayYmd);

  return {
    emesseMese: month.filter((i) => i.status !== "bozza" && i.status !== "da_verificare").length,
    daIncassare: roundMoney(billed.reduce((sum, i) => sum + i.residuo, 0)),
    scadute: overdue.length,
    fatturatoMese: roundMoney(monthBilled.reduce((sum, i) => sum + i.totale, 0)),
    fatturatoAnno: roundMoney(yearBilled.reduce((sum, i) => sum + i.totale, 0)),
    clientiConInsoluti: new Set(overdue.map((i) => i.cliente_label.trim().toLowerCase()).filter(Boolean)).size,
  };
}
