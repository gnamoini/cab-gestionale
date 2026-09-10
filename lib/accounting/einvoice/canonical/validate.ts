import { isSchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";
import { InvoiceCanonicalizationError } from "@/lib/accounting/einvoice/errors/invoice-canonicalization-error";

export function validateCanonicalStructure(invoice: CanonicalElectronicInvoice): void {
  const errors: InvoiceCanonicalizationError[] = [];

  if (!invoice.schemaVersion) {
    errors.push(new InvoiceCanonicalizationError("SCHEMA_VERSION_MISSING", "schemaVersion mancante", { field: "schemaVersion" }));
  }
  if (!invoice.transmissionFormat) {
    errors.push(new InvoiceCanonicalizationError("TRANSMISSION_FORMAT_MISSING", "Formato trasmissione mancante", { field: "transmissionFormat" }));
  }
  if (!isSchemaSupportedDocumentType(invoice.document.type)) {
    errors.push(new InvoiceCanonicalizationError("DOCUMENT_TYPE_INVALID", `Tipo documento non supportato: ${invoice.document.type}`, { field: "document.type" }));
  }
  if (!invoice.document.number) {
    errors.push(new InvoiceCanonicalizationError("DOCUMENT_NUMBER_MISSING", "Numero documento mancante", { field: "document.number" }));
  }
  if (!invoice.document.date) {
    errors.push(new InvoiceCanonicalizationError("DOCUMENT_DATE_MISSING", "Data documento mancante", { field: "document.date" }));
  }
  if (invoice.lines.length === 0) {
    errors.push(new InvoiceCanonicalizationError("LINES_EMPTY", "Almeno una riga richiesta", { field: "lines" }));
  }

  if (errors.length > 0) {
    throw errors[0];
  }
}
