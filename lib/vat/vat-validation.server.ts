import { roundMoney, VAT_AMOUNT_TOLERANCE, vatAmountsConsistent } from "@/lib/vat/vat-rounding";
import type { VatConfiguration, VatLineCalculation, VatValidationError } from "@/lib/vat/types";

export function validateConfigurationCombo(config: Pick<VatConfiguration, "operation_type_code" | "nature_code" | "rate">): VatValidationError | null {
  const rate = Number(config.rate);
  if (!Number.isFinite(rate) || rate < 0) {
    return { code: "VAT_RATE_INVALID" };
  }

  if (config.operation_type_code === "IMPONIBILE") {
    if (rate <= 0) return { code: "VAT_RATE_MISMATCH" };
    if (config.nature_code) return { code: "VAT_NATURE_NOT_ALLOWED" };
  } else if (["ESENTE", "NON_IMPONIBILE", "NON_SOGGETTA"].includes(config.operation_type_code)) {
    if (!config.nature_code) return { code: "VAT_NATURE_REQUIRED" };
  } else if (config.operation_type_code === "REVERSE_CHARGE") {
    if (!config.nature_code?.startsWith("N6.")) return { code: "VAT_NATURE_REQUIRED" };
  }

  return null;
}

export function validateLineAmounts(
  calculated: VatLineCalculation,
  actual: { imponibile: number; iva: number; totale: number },
  rowId?: string,
): VatValidationError | null {
  if (Math.abs(calculated.taxable_amount - actual.imponibile) > VAT_AMOUNT_TOLERANCE) {
    return { code: "VAT_AMOUNT_MISMATCH", row_id: rowId };
  }
  if (Math.abs(calculated.vat_amount - actual.iva) > VAT_AMOUNT_TOLERANCE) {
    return { code: "VAT_AMOUNT_MISMATCH", row_id: rowId };
  }
  if (Math.abs(calculated.gross_amount - actual.totale) > VAT_AMOUNT_TOLERANCE) {
    return { code: "VAT_AMOUNT_MISMATCH", row_id: rowId };
  }
  return null;
}

export function validateInvoiceVatForEInvoiceRow(row: {
  id?: string;
  imponibile: number;
  iva: number;
  vat_rate: number | null;
  vat_nature: string | null;
  vat_operation_type: string | null;
  vat_snapshot: Record<string, unknown> | null;
}): VatValidationError | null {
  if (!row.vat_snapshot) {
    return { code: "VAT_SNAPSHOT_MISSING", row_id: row.id };
  }

  if (row.vat_operation_type === "IMPONIBILE" && (row.vat_rate ?? 0) > 0) {
    if (!vatAmountsConsistent(row.imponibile, row.vat_rate ?? 0, row.iva)) {
      return { code: "VAT_AMOUNT_MISMATCH", row_id: row.id };
    }
  } else if (row.vat_operation_type !== "IMPONIBILE" && !row.vat_nature) {
    return { code: "VAT_NATURE_REQUIRED", row_id: row.id };
  }

  return null;
}

export function validateDocumentTotals(
  lines: readonly VatLineCalculation[],
  header: { imponibile: number; iva: number; totale: number },
): VatValidationError | null {
  const sum = lines.reduce(
    (acc, l) => ({
      imponibile: roundMoney(acc.imponibile + l.taxable_amount),
      iva: roundMoney(acc.iva + l.vat_amount),
      totale: roundMoney(acc.totale + l.gross_amount),
    }),
    { imponibile: 0, iva: 0, totale: 0 },
  );

  if (
    Math.abs(sum.imponibile - header.imponibile) > VAT_AMOUNT_TOLERANCE ||
    Math.abs(sum.iva - header.iva) > VAT_AMOUNT_TOLERANCE ||
    Math.abs(sum.totale - header.totale) > VAT_AMOUNT_TOLERANCE
  ) {
    return { code: "DOCUMENT_TOTAL_CONSISTENT" };
  }

  return null;
}
