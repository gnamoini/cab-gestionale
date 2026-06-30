import type { InvoiceRow } from "@/src/types/supabase-tables";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { invoiceStatusLabel } from "@/lib/fatturazione/fatturazione-advanced-filters";

export function exportInvoicesCsv(rows: readonly InvoiceRow[]): string {
  const header = ["Numero", "Anno", "Cliente", "Emissione", "Scadenza", "Imponibile", "IVA", "Totale", "Pagato", "Residuo", "Stato"];
  const lines = rows.map((r) =>
    [
      r.numero,
      r.anno,
      csvCell(r.cliente_label),
      r.data_emissione,
      r.data_scadenza ?? "",
      r.imponibile,
      r.iva,
      r.totale,
      r.pagato,
      r.residuo,
      invoiceStatusLabel(r.status),
    ].join(";"),
  );
  return `\uFEFF${header.join(";")}\n${lines.join("\n")}`;
}

function csvCell(value: string): string {
  const v = value.replace(/"/g, '""');
  return v.includes(";") || v.includes('"') ? `"${v}"` : v;
}

export function downloadInvoicesCsv(rows: readonly InvoiceRow[], filename = "fatture-export.csv"): void {
  const blob = new Blob([exportInvoicesCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function invoiceListLabel(row: InvoiceRow): string {
  return `${invoiceDisplayNumber(row)} · ${row.cliente_label}`;
}
