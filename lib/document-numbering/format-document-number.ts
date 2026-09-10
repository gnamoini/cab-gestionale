export const DOCUMENT_NUMBER_TYPES = ["fattura", "nota_credito", "nota_debito", "ddt"] as const;

export type DocumentNumberType = (typeof DOCUMENT_NUMBER_TYPES)[number];

export const DOCUMENT_SERIES_DEFAULT = "DEFAULT";

/** SSOT: trim → uppercase; empty/null → DEFAULT */
export function normalizeDocumentSeries(series: string | null | undefined): string {
  const trimmed = (series ?? "").trim();
  if (!trimmed) return DOCUMENT_SERIES_DEFAULT;
  return trimmed.toUpperCase();
}

function padProgressive(n: number): string {
  return String(Math.trunc(n)).padStart(3, "0");
}

/** Deterministic display — never authoritative for allocation. */
export function formatDocumentNumber(
  documentType: DocumentNumberType,
  fiscalYear: number,
  progressive: number,
  series = DOCUMENT_SERIES_DEFAULT,
): string {
  const padded = padProgressive(progressive);
  const seriesNorm = normalizeDocumentSeries(series);

  switch (documentType) {
    case "fattura":
      return `FT ${fiscalYear}/${padded}`;
    case "nota_credito":
      return `NC ${fiscalYear}/${padded}`;
    case "nota_debito":
      return `ND ${fiscalYear}/${padded}`;
    case "ddt":
      if (seriesNorm === DOCUMENT_SERIES_DEFAULT) {
        return `DDT ${fiscalYear}/${padded}`;
      }
      return `DDT ${seriesNorm}/${fiscalYear}/${padded}`;
    default: {
      const _exhaustive: never = documentType;
      return _exhaustive;
    }
  }
}

/** Invoice row adapter — proforma out of FASE 6 fiscal numbering scope. */
export function formatInvoiceDocumentNumber(row: {
  document_type?: string | null;
  anno: number;
  numero: number | null;
  series?: string | null;
}): string {
  if (row.numero == null) return "Bozza";
  const docType =
    row.document_type === "nota_credito"
      ? "nota_credito"
      : row.document_type === "nota_debito"
        ? "nota_debito"
        : "fattura";
  return formatDocumentNumber(docType, row.anno, row.numero, row.series ?? DOCUMENT_SERIES_DEFAULT);
}

/** DDT row adapter */
export function formatDdtDocumentNumber(row: {
  numero: number | null;
  anno: number;
  serie?: string | null;
}): string {
  if (row.numero == null) return "Bozza";
  return formatDocumentNumber("ddt", row.anno, row.numero, row.serie ?? DOCUMENT_SERIES_DEFAULT);
}
