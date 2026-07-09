import type { InvoiceDocumentType } from "@/src/types/supabase-tables";

const PREFIX: Record<InvoiceDocumentType, string> = {
  fattura: "FT",
  nota_credito: "NC",
  proforma: "PF",
};

export function formatInvoiceSequenceNumber(
  documentType: InvoiceDocumentType,
  year: number,
  number: number,
  series = "default",
): string {
  const prefix = PREFIX[documentType] ?? "FT";
  const seriesPart = series && series !== "default" ? `-${series.toUpperCase()}` : "";
  return `${prefix}${seriesPart}-${year}-${String(number).padStart(6, "0")}`;
}
