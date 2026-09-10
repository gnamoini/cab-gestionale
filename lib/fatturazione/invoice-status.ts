import type {
  InvoiceDocumentStatus,
  InvoiceFiscalValidity,
  InvoicePaymentStatus,
  InvoiceRow,
  InvoiceSdiStatus,
} from "@/src/types/supabase-tables";

/** SSOT lettura assi — fallback su status legacy se colonne assi assenti. */
export function invoiceDocumentStatus(row: InvoiceRow): InvoiceDocumentStatus {
  if (row.document_status) return row.document_status;
  return mapLegacyToDocument(row.status);
}

export function invoicePaymentStatus(row: InvoiceRow): InvoicePaymentStatus {
  if (row.payment_status) return row.payment_status;
  return mapLegacyToPayment(row.status);
}

export function invoiceSdiStatus(row: InvoiceRow): InvoiceSdiStatus {
  if (row.sdi_status) return row.sdi_status;
  return "non_applicabile";
}

export function invoiceFiscalValidity(row: InvoiceRow): InvoiceFiscalValidity {
  if (row.fiscal_validity) return row.fiscal_validity;
  if (row.status === "bozza" || row.status === "da_verificare") return "not_applicable";
  return "validly_issued";
}

/** Fatturato / incasso / scadenze: solo documenti fiscalmente validi. */
export function invoiceCountsAsValidlyIssued(row: InvoiceRow): boolean {
  return invoiceFiscalValidity(row) === "validly_issued";
}

function mapLegacyToDocument(status: InvoiceRow["status"]): InvoiceDocumentStatus {
  switch (status) {
    case "bozza":
      return "bozza";
    case "da_verificare":
      return "da_verificare";
    case "annullata":
      return "annullata";
    default:
      return "emessa";
  }
}

function mapLegacyToPayment(status: InvoiceRow["status"]): InvoicePaymentStatus {
  switch (status) {
    case "parzialmente_pagata":
      return "parzialmente_pagata";
    case "pagata":
      return "pagata";
    case "scaduta":
      return "scaduta";
    default:
      return "non_pagata";
  }
}

export const INVOICE_DOCUMENT_STATUS_LABELS: Record<InvoiceDocumentStatus, string> = {
  bozza: "Bozza",
  da_verificare: "Da verificare",
  approvata: "Approvata",
  emessa: "Emessa",
  annullata: "Annullata",
};

export const INVOICE_PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  non_pagata: "Non pagata",
  parzialmente_pagata: "Parz. pagata",
  pagata: "Pagata",
  scaduta: "Scaduta",
};

export const INVOICE_SDI_STATUS_LABELS: Record<InvoiceSdiStatus, string> = {
  non_applicabile: "N/A",
  da_generare: "Da generare",
  generata: "XML generato",
  inviata: "Inviata",
  accettata: "Accettata",
  consegnata: "Consegnata",
  impossibilita_consegna: "Mancata consegna",
  scartata: "Scartata",
  rifiutata: "Rifiutata",
};

export const INVOICE_FISCAL_VALIDITY_LABELS: Record<InvoiceFiscalValidity, string> = {
  not_applicable: "Non applicabile",
  pending: "In attesa SdI",
  validly_issued: "Fiscalmente valida",
  not_validly_issued: "Non valida fiscalmente",
};

export type InvoiceCompositeFilter =
  | ""
  | "bozza"
  | "da_verificare"
  | "confermate"
  | "pronte_invio"
  | "in_trasmissione"
  | "in_riconciliazione"
  | "consegnate"
  | "impossibilita_consegna"
  | "scartate";

export function invoiceMatchesCompositeFilter(row: InvoiceRow, filter: InvoiceCompositeFilter): boolean {
  if (!filter) return true;
  const doc = invoiceDocumentStatus(row);
  const sdi = invoiceSdiStatus(row);
  const fv = invoiceFiscalValidity(row);
  switch (filter) {
    case "bozza":
      return doc === "bozza";
    case "da_verificare":
      return doc === "da_verificare";
    case "confermate":
      return doc === "emessa" && fv === "pending" && sdi === "da_generare";
    case "pronte_invio":
      return doc === "emessa" && sdi === "generata";
    case "in_trasmissione":
      return doc === "emessa" && sdi === "inviata" && fv === "pending";
    case "in_riconciliazione":
      return doc === "emessa" && sdi === "inviata" && fv === "pending";
    case "consegnate":
      return sdi === "consegnata" && fv === "validly_issued";
    case "impossibilita_consegna":
      return sdi === "impossibilita_consegna" && fv === "validly_issued";
    case "scartate":
      return sdi === "scartata" && fv === "not_validly_issued";
    default:
      return true;
  }
}

/** ponytail: KPI/revenue MUST use fiscal_validity, never document_status alone. */
export function assertFiscalAuthorityNotDocumentStatus(code: string): void {
  if (/document_status\s*===\s*['"]emessa['"]/.test(code) && !/fiscal_validity/.test(code)) {
    throw new Error("FISCAL_AUTHORITY_VIOLATION: use fiscal_validity, not document_status");
  }
}
