/**
 * @deprecated Import from `@/lib/accounting/einvoice` or `@/lib/fatturazione/einvoice/build-canonical-from-snapshot`.
 * Thin compatibility re-exports for FASE 9 callers.
 */
import type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";

export type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";

export type CanonicalInvoiceLine = {
  numeroLinea: number;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  imponibile: number;
  iva: number;
  vatRate: number | null;
  vatNature: string | null;
  vatCodeId: string | null;
  sourceType: string | null;
  sourceId: string | null;
};

export type CanonicalVatSummary = {
  aliquota: number | null;
  natura: string | null;
  imponibile: number;
  imposta: number;
  esigibilitaIva: string | null;
};

export type CanonicalInvoiceReference = {
  type: "ddt" | "ordine" | "preventivo" | "consuntivo" | "lavorazione";
  id: string;
  label: string;
  date?: string | null;
  number?: string | null;
};

export type CanonicalPaymentTerm = {
  condizioni: string | null;
  modalita: string | null;
  scadenza: string | null;
  importo: number | null;
  iban: string | null;
};

export type CanonicalInvoice = {
  identity: { id: string; companyId: string; documentType: string; origine: string | null };
  fiscalData: {
    tipoDocumento: string;
    numero: number | null;
    serie: string;
    anno: number;
    dataEmissione: string;
    dataEffettuazione: string | null;
    fiscalValidity: string | null;
    fiscalContext: Record<string, unknown> | null;
  };
  customer: Record<string, unknown>;
  cedente: InvoiceEmissionSnapshot["cedente"];
  lines: CanonicalInvoiceLine[];
  vatSummaries: CanonicalVatSummary[];
  totals: { imponibile: number; iva: number; totale: number };
  paymentTerms: CanonicalPaymentTerm[];
  references: CanonicalInvoiceReference[];
  lifecycle: {
    documentStatus: string | null;
    sdiStatus: string | null;
    fiscalValidity: string | null;
    transmissionAttempt: number;
  };
};

/** @deprecated Use buildCanonicalFromSnapshot */
export function buildCanonicalInvoiceFromSnapshot(
  invoiceId: string,
  companyId: string,
  snapshot: InvoiceEmissionSnapshot,
  meta?: {
    documentType?: string;
    origine?: string | null;
    documentStatus?: string | null;
    sdiStatus?: string | null;
    fiscalValidity?: string | null;
    transmissionAttempt?: number;
    fiscalContext?: Record<string, unknown> | null;
    references?: CanonicalInvoiceReference[];
    paymentTerms?: CanonicalPaymentTerm[];
  },
): CanonicalInvoice {
  const canonical = buildCanonicalFromSnapshot(invoiceId, companyId, snapshot, {
    documentType: meta?.documentType,
    origine: meta?.origine,
    fiscalContext: meta?.fiscalContext as never,
    references: meta?.references
      ? { linkedDocuments: meta.references.map((r) => ({ ...r, type: r.type })) }
      : null,
    payment: meta?.paymentTerms?.map((p) => ({
      paymentConditions: p.condizioni,
      paymentMethod: p.modalita,
      dueDate: p.scadenza,
      amount: p.importo,
      iban: p.iban,
    })),
  });

  return {
    identity: {
      id: canonical.metadata.invoiceId,
      companyId: canonical.metadata.companyId,
      documentType: canonical.metadata.cabDocumentKind,
      origine: meta?.origine ?? null,
    },
    fiscalData: {
      tipoDocumento: canonical.document.type,
      numero: Number(canonical.document.number) || null,
      serie: "DEFAULT",
      anno: Number(canonical.document.date.slice(0, 4)) || 0,
      dataEmissione: canonical.document.date,
      dataEffettuazione: canonical.document.performanceDate ?? null,
      fiscalValidity: meta?.fiscalValidity ?? null,
      fiscalContext: meta?.fiscalContext ?? null,
    },
    customer: snapshot.cliente ?? {},
    cedente: snapshot.cedente,
    lines: canonical.lines.map((l) => ({
      numeroLinea: l.lineNumber,
      descrizione: l.description,
      quantita: l.quantity,
      prezzoUnitario: l.unitPrice,
      imponibile: l.netAmount,
      iva: l.vatAmount,
      vatRate: l.vatRate,
      vatNature: l.vatNature,
      vatCodeId: l.vatCodeId,
      sourceType: null,
      sourceId: null,
    })),
    vatSummaries: canonical.vatSummaries.map((v) => ({
      aliquota: v.vatRate,
      natura: v.vatNature,
      imponibile: v.taxableAmount,
      imposta: v.taxAmount,
      esigibilitaIva: v.vatCollectability,
    })),
    totals: {
      imponibile: canonical.totals.netAmount,
      iva: canonical.totals.vatAmount,
      totale: canonical.totals.grossAmount,
    },
    paymentTerms: [],
    references: meta?.references ?? [],
    lifecycle: {
      documentStatus: meta?.documentStatus ?? null,
      sdiStatus: meta?.sdiStatus ?? null,
      fiscalValidity: meta?.fiscalValidity ?? null,
      transmissionAttempt: meta?.transmissionAttempt ?? 0,
    },
  };
}
