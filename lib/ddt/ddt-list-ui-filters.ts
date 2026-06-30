import type { DdtStatus } from "@/lib/ddt/types";
import type { DdtDocumentRow, DdtLineRow } from "@/src/types/supabase-tables";

export type DdtSortKey = "numero" | "data" | "cliente" | "stato";

export type DdtPageFilters = {
  q: string;
  status: DdtStatus | "";
  dateFrom: string;
  dateTo: string;
  withPreventivo: "" | "yes" | "no";
  delivery: "" | "consegnato" | "non_consegnato";
};

export const DDT_PAGE_FILTERS_EMPTY: DdtPageFilters = {
  q: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  withPreventivo: "",
  delivery: "",
};

export function ddtDisplayNumber(doc: Pick<DdtDocumentRow, "numero" | "anno">): string {
  if (doc.numero == null) return "Bozza";
  return `${doc.numero}/${doc.anno}`;
}

export function ddtPageFiltersActive(f: DdtPageFilters): boolean {
  return Boolean(
    f.q.trim() ||
      f.status ||
      f.dateFrom ||
      f.dateTo ||
      f.withPreventivo ||
      f.delivery,
  );
}

export function ddtRowSearchContext(
  doc: DdtDocumentRow,
  rows: readonly DdtLineRow[],
): string {
  const rowText = rows
    .filter((r) => r.ddt_id === doc.id)
    .map((r) => `${r.descrizione} ${r.codice ?? ""}`)
    .join(" ");
  const mezzo = doc.mezzo_snapshot as Record<string, unknown> | undefined;
  const targa = typeof mezzo?.targa === "string" ? mezzo.targa : "";
  const matricola = typeof mezzo?.matricola === "string" ? mezzo.matricola : "";
  return [
    ddtDisplayNumber(doc),
    doc.cliente_label,
    doc.causale_trasporto ?? "",
    doc.vettore ?? "",
    doc.preventivo_id ?? "",
    targa,
    matricola,
    rowText,
  ]
    .join(" ")
    .toLowerCase();
}

export function ddtRowMatchesPageFilters(
  doc: DdtDocumentRow,
  rows: readonly DdtLineRow[],
  f: DdtPageFilters,
): boolean {
  if (f.status && doc.status !== f.status) return false;
  if (f.dateFrom && doc.data_documento < f.dateFrom) return false;
  if (f.dateTo && doc.data_documento > f.dateTo) return false;
  if (f.withPreventivo === "yes" && !doc.preventivo_id) return false;
  if (f.withPreventivo === "no" && doc.preventivo_id) return false;
  if (f.delivery === "consegnato" && doc.status !== "consegnato") return false;
  if (f.delivery === "non_consegnato" && doc.status === "consegnato") return false;
  const q = f.q.trim().toLowerCase();
  if (q && !ddtRowSearchContext(doc, rows).includes(q)) return false;
  return true;
}

export function sortDdtDocuments(
  docs: DdtDocumentRow[],
  sortCol: DdtSortKey | null,
  desc: boolean,
): DdtDocumentRow[] {
  const col = sortCol ?? "data";
  const mul = desc ? -1 : 1;
  return [...docs].sort((a, b) => {
    switch (col) {
      case "numero":
        return mul * ((a.numero ?? 0) - (b.numero ?? 0)) || mul * (a.anno - b.anno);
      case "cliente":
        return mul * a.cliente_label.localeCompare(b.cliente_label, "it");
      case "stato":
        return mul * a.status.localeCompare(b.status, "it");
      case "data":
      default:
        return mul * a.data_documento.localeCompare(b.data_documento);
    }
  });
}
