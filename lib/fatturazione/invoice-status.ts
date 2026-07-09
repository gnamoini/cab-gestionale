import type {
  InvoiceDocumentStatus,
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
