import { roundMoney } from "@/lib/vat/vat-rounding";
import type { CanonicalElectronicInvoice, InvoiceLine, VatSummary } from "@/lib/accounting/einvoice/canonical/model";

function normDate(value: string | null | undefined): string {
  const v = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return v;
}

function normLine(line: InvoiceLine): InvoiceLine {
  return {
    ...line,
    description: line.description.trim(),
    quantity: roundMoney(line.quantity),
    unitPrice: roundMoney(line.unitPrice),
    netAmount: roundMoney(line.netAmount),
    vatAmount: roundMoney(line.vatAmount),
    vatRate: line.vatRate != null ? roundMoney(line.vatRate) : null,
  };
}

function normVatSummary(s: VatSummary): VatSummary {
  return {
    ...s,
    taxableAmount: roundMoney(s.taxableAmount),
    taxAmount: roundMoney(s.taxAmount),
    vatRate: s.vatRate != null ? roundMoney(s.vatRate) : null,
  };
}

/** Technical normalizations for FatturaPA serialization — no fiscal recalculation. */
export function normalizeCanonicalInvoice(invoice: CanonicalElectronicInvoice): CanonicalElectronicInvoice {
  const lines = invoice.lines.map(normLine);
  const vatSummaries = invoice.vatSummaries.map(normVatSummary);
  const totals = {
    netAmount: roundMoney(invoice.totals.netAmount),
    vatAmount: roundMoney(invoice.totals.vatAmount),
    grossAmount: roundMoney(invoice.totals.grossAmount),
    currency: invoice.totals.currency.trim().toUpperCase() || "EUR",
  };

  return {
    ...invoice,
    transmission: {
      ...invoice.transmission,
      recipientCode: invoice.transmission.recipientCode.trim().toUpperCase(),
      recipientPec: invoice.transmission.recipientPec?.trim() || null,
      progressiveTransmissionId: invoice.transmission.progressiveTransmissionId.trim(),
    },
    document: {
      ...invoice.document,
      date: normDate(invoice.document.date),
      performanceDate: invoice.document.performanceDate ? normDate(invoice.document.performanceDate) : null,
      number: String(invoice.document.number).trim(),
      currency: totals.currency,
      totalDocumentAmount: roundMoney(invoice.document.totalDocumentAmount),
      causale: invoice.document.causale?.map((c) => c.trim()).filter(Boolean),
    },
    lines,
    vatSummaries,
    totals,
    stampDuty: invoice.stampDuty
      ? {
          ...invoice.stampDuty,
          amount: roundMoney(invoice.stampDuty.amount),
        }
      : null,
  };
}
