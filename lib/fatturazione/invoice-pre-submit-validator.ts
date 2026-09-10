import { validateCodiceDestinatario, validatePec } from "@/lib/fiscal/validate";
import type { CanonicalInvoice } from "@/lib/fatturazione/invoice-canonical";

export type ValidationIssue = {
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult =
  | { valid: true; issues: [] }
  | { valid: false; issues: ValidationIssue[] };

function issue(
  code: string,
  field: string,
  message: string,
  severity: "error" | "warning" = "error",
): ValidationIssue {
  return { code, field, message, severity };
}

export function validateCanonicalInvoiceForSubmission(invoice: CanonicalInvoice): ValidationResult {
  const issues: ValidationIssue[] = [];
  const cedente = invoice.cedente ?? {};
  const cliente = invoice.customer ?? {};
  const doc = invoice.fiscalData;

  if (!cedente.ragione_sociale) {
    issues.push(issue("CEDENTE_MISSING", "cedente.ragione_sociale", "Ragione sociale cedente mancante"));
  }
  if (!cedente.partita_iva && !cedente.codice_fiscale) {
    issues.push(issue("CEDENTE_ID_MISSING", "cedente", "Partita IVA o codice fiscale cedente obbligatorio"));
  }
  if (!cedente.indirizzo || !cedente.cap || !cedente.comune) {
    issues.push(issue("CEDENTE_ADDRESS_INCOMPLETE", "cedente.indirizzo", "Indirizzo cedente incompleto"));
  }

  const dest = String(cliente.codice_destinatario ?? cliente.codice_sdi ?? "").trim().toUpperCase();
  const pec = String(cliente.pec ?? "").trim();
  if (dest === "0000000") {
    if (!validatePec(pec)) {
      issues.push(issue("RECIPIENT_PEC_INVALID", "cliente.pec", "PEC destinatario non valida (codice 0000000)"));
    }
  } else if (dest && !validateCodiceDestinatario(dest)) {
    issues.push(issue("RECIPIENT_SDI_INVALID", "cliente.codice_destinatario", "Codice destinatario non valido"));
  }

  const clienteLabel = String(cliente.ragione_sociale ?? cliente.cliente_label ?? "").trim();
  if (!clienteLabel) {
    issues.push(issue("CUSTOMER_NAME_MISSING", "cliente", "Denominazione cliente mancante"));
  }

  if (!doc.tipoDocumento) issues.push(issue("DOC_TYPE_MISSING", "documento.tipo_documento", "Tipo documento mancante"));
  if (!doc.numero) issues.push(issue("NUMBER_MISSING", "documento.numero", "Numero fattura mancante"));
  if (!doc.dataEmissione) issues.push(issue("DATE_MISSING", "documento.data_emissione", "Data emissione mancante"));
  if (invoice.lines.length === 0) issues.push(issue("LINES_MISSING", "righe", "Almeno una riga documento richiesta"));

  for (const line of invoice.lines) {
    if (!line.descrizione.trim()) {
      issues.push(issue("LINE_DESC_MISSING", `righe[${line.numeroLinea}].descrizione`, "Descrizione riga mancante"));
    }
    if (line.quantita <= 0) {
      issues.push(issue("LINE_QTY_INVALID", `righe[${line.numeroLinea}].quantita`, "Quantità non valida"));
    }
    if (!line.vatNature && (line.vatRate == null || line.vatRate < 0)) {
      issues.push(issue("LINE_VAT_MISSING", `righe[${line.numeroLinea}].vat`, "Aliquota o natura IVA mancante"));
    }
  }

  const { imponibile, iva, totale } = invoice.totals;
  const lineImponibile = invoice.lines.reduce((s, l) => s + l.imponibile, 0);
  const lineIva = invoice.lines.reduce((s, l) => s + l.iva, 0);
  if (Math.abs(lineImponibile - imponibile) > 0.05) {
    issues.push(issue("TOTALS_IMPONIBILE_MISMATCH", "totali.imponibile", "Imponibile non coerente con le righe"));
  }
  if (Math.abs(lineIva - iva) > 0.05) {
    issues.push(issue("TOTALS_IVA_MISMATCH", "totali.iva", "IVA non coerente con le righe"));
  }
  if (Math.abs(imponibile + iva - totale) > 0.05) {
    issues.push(issue("TOTALS_MISMATCH", "totali", "Totale documento non coerente (imponibile + IVA)"));
  }

  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) return { valid: false, issues };
  return { valid: true, issues: [] };
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.filter((i) => i.severity === "error").map((i) => `- ${i.message}`).join("\n");
}
