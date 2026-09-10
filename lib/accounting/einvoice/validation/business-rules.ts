import { validateCodiceDestinatario, validatePec } from "@/lib/fiscal/validate";
import { VAT_AMOUNT_TOLERANCE } from "@/lib/vat/vat-rounding";
import { isCabEnabledDocumentType, isSchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";
import { validationFail, validationOk, type ValidationResult } from "@/lib/accounting/einvoice/validation/validation-result";

export function validateBusinessRules(invoice: CanonicalElectronicInvoice, opts?: { requireCabEnabled?: boolean }): ValidationResult {
  const errors: Array<{ code: string; message: string; field?: string; path?: string }> = [];
  const requireCab = opts?.requireCabEnabled ?? true;

  if (!isSchemaSupportedDocumentType(invoice.document.type)) {
    errors.push({ code: "DOCUMENT_TYPE_UNSUPPORTED", message: `Tipo documento non supportato: ${invoice.document.type}`, field: "document.type" });
  } else if (requireCab && !isCabEnabledDocumentType(invoice.document.type)) {
    errors.push({
      code: "DOCUMENT_TYPE_NOT_ENABLED_FOR_CAB",
      message: `Tipo documento ${invoice.document.type} non abilitato nel ciclo attivo CAB`,
      field: "document.type",
    });
  }

  const supplier = invoice.supplier;
  if (!supplier.denomination && !(supplier.firstName && supplier.lastName)) {
    errors.push({ code: "CEDENTE_NAME_MISSING", message: "Denominazione cedente mancante", field: "supplier" });
  }
  if (!supplier.vatIdentity?.vatNumber && !supplier.fiscalCode) {
    errors.push({ code: "CEDENTE_ID_MISSING", message: "Partita IVA o CF cedente obbligatorio", field: "supplier" });
  }
  if (!supplier.address?.street || !supplier.address.postalCode || !supplier.address.city) {
    errors.push({ code: "CEDENTE_ADDRESS_INCOMPLETE", message: "Indirizzo cedente incompleto", field: "supplier.address" });
  }

  const dest = invoice.transmission.recipientCode;
  const pec = invoice.transmission.recipientPec ?? "";
  if (!dest) {
    errors.push({ code: "RECIPIENT_CODE_MISSING", message: "Codice destinatario o PEC obbligatori", field: "transmission.recipientCode" });
  } else if (dest === "0000000") {
    if (!validatePec(pec)) {
      errors.push({ code: "RECIPIENT_PEC_INVALID", message: "PEC destinatario non valida", field: "transmission.recipientPec" });
    }
  } else if (!validateCodiceDestinatario(dest)) {
    errors.push({ code: "RECIPIENT_SDI_INVALID", message: "Codice destinatario non valido", field: "transmission.recipientCode" });
  }

  const customer = invoice.customer;
  if (!customer.denomination && !(customer.firstName && customer.lastName)) {
    errors.push({ code: "CUSTOMER_NAME_MISSING", message: "Denominazione cliente mancante", field: "customer" });
  }

  if (invoice.transmissionFormat === "FPA12" && !customer.isPublicAdministration) {
    errors.push({ code: "FPA12_CUSTOMER_NOT_PA", message: "FPA12 richiede destinatario PA", field: "transmissionFormat" });
  }
  if (invoice.transmissionFormat === "FPR12" && customer.isPublicAdministration) {
    errors.push({ code: "FPR12_CUSTOMER_IS_PA", message: "FPR12 non coerente con destinatario PA", field: "transmissionFormat" });
  }

  for (const line of invoice.lines) {
    if (!line.description.trim()) {
      errors.push({ code: "LINE_DESC_MISSING", message: "Descrizione riga mancante", field: `lines[${line.lineNumber}]` });
    }
    if (line.quantity <= 0) {
      errors.push({ code: "LINE_QTY_INVALID", message: "Quantità non valida", field: `lines[${line.lineNumber}].quantity` });
    }
    if (!line.vatNature && (line.vatRate == null || line.vatRate < 0)) {
      errors.push({ code: "LINE_VAT_MISSING", message: "Aliquota o natura IVA mancante", field: `lines[${line.lineNumber}]` });
    }
    if (line.vatNature && line.vatRate != null && line.vatRate !== 0) {
      errors.push({ code: "NATURA_RATE_MISMATCH", message: "Natura con aliquota non zero", field: `lines[${line.lineNumber}]` });
    }
  }

  const lineNet = invoice.lines.reduce((s, l) => s + l.netAmount, 0);
  const lineVat = invoice.lines.reduce((s, l) => s + l.vatAmount, 0);
  if (Math.abs(lineNet - invoice.totals.netAmount) > VAT_AMOUNT_TOLERANCE * invoice.lines.length) {
    errors.push({ code: "TOTALS_IMPONIBILE_MISMATCH", message: "Imponibile non coerente con le righe", field: "totals.netAmount" });
  }
  if (Math.abs(lineVat - invoice.totals.vatAmount) > VAT_AMOUNT_TOLERANCE * invoice.lines.length) {
    errors.push({ code: "TOTALS_IVA_MISMATCH", message: "IVA non coerente con le righe", field: "totals.vatAmount" });
  }
  if (Math.abs(invoice.totals.netAmount + invoice.totals.vatAmount - invoice.totals.grossAmount) > VAT_AMOUNT_TOLERANCE) {
    errors.push({ code: "TOTALS_GROSS_MISMATCH", message: "Totale documento non coerente", field: "totals.grossAmount" });
  }

  if (invoice.document.type === "TD04" || invoice.document.type === "TD05") {
    const hasLinked = invoice.references?.linkedDocuments?.some((r) => r.type === "fattura_collegata");
    if (!hasLinked) {
      errors.push({
        code: "CREDIT_DEBIT_NOTE_REFERENCE_MISSING",
        message: "Nota credito/debito richiede riferimento fattura collegata",
        field: "references",
      });
    }
  }

  if (invoice.document.type === "TD24" || invoice.document.type === "TD25") {
    const hasDdt = invoice.references?.linkedDocuments?.some((r) => r.type === "ddt");
    if (!hasDdt) {
      errors.push({ code: "DEFERRED_INVOICE_DDT_MISSING", message: "Fattura differita richiede riferimento DDT", field: "references" });
    }
  }

  if (errors.length > 0) return validationFail("BUSINESS", errors);
  return validationOk("BUSINESS");
}
