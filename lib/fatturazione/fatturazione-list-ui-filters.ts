import {
  FATTURAZIONE_ADVANCED_FILTERS_EMPTY,
  fatturazioneAdvancedFiltersActive,
  invoiceMatchesAdvancedFilters,
  type FatturazioneAdvancedFilters,
} from "@/lib/fatturazione/fatturazione-advanced-filters";
import type { InvoiceLinkRow, InvoiceRow } from "@/src/types/supabase-tables";

export type FatturazionePageFilters = FatturazioneAdvancedFilters & {
  search: string;
};

export const FATTURAZIONE_PAGE_FILTERS_EMPTY: FatturazionePageFilters = {
  ...FATTURAZIONE_ADVANCED_FILTERS_EMPTY,
  search: "",
};

export type FatturazioneListRowContext = {
  links: readonly InvoiceLinkRow[];
  snapshotPiva: string;
  preventivoNums: string;
};

export function invoiceDisplayNumber(row: InvoiceRow): string {
  return `${row.numero}/${row.anno}`;
}

export function invoiceRowSearchHaystack(row: InvoiceRow, ctx: FatturazioneListRowContext): string {
  const snap = row.customer_snapshot && typeof row.customer_snapshot === "object" ? row.customer_snapshot : {};
  const piva = typeof (snap as Record<string, unknown>).partita_iva === "string" ? (snap as Record<string, unknown>).partita_iva : ctx.snapshotPiva;
  return [
    invoiceDisplayNumber(row),
    row.cliente_label,
    piva,
    row.status,
    row.note,
    ctx.preventivoNums,
    String(row.totale),
    String(row.imponibile),
  ]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

export function invoiceRowMatchesGlobalSearch(row: InvoiceRow, ctx: FatturazioneListRowContext, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return invoiceRowSearchHaystack(row, ctx).includes(q);
}

export function invoiceRowMatchesPageFilters(
  row: InvoiceRow,
  ctx: FatturazioneListRowContext,
  filters: FatturazionePageFilters,
): boolean {
  if (!invoiceRowMatchesGlobalSearch(row, ctx, filters.search)) return false;
  const { search: _s, ...advanced } = filters;
  return invoiceMatchesAdvancedFilters(row, advanced);
}

export function fatturazionePageFiltersActive(filters: FatturazionePageFilters): boolean {
  return Boolean(filters.search.trim()) || fatturazioneAdvancedFiltersActive(filters);
}

export type FatturazioneSortKey = "numero" | "data" | "cliente" | "totale" | "residuo" | "scadenza" | "status";

export function sortInvoices(
  rows: InvoiceRow[],
  key: FatturazioneSortKey,
  asc: boolean,
): InvoiceRow[] {
  const dir = asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "numero":
        cmp = a.anno !== b.anno ? a.anno - b.anno : a.numero - b.numero;
        break;
      case "data":
        cmp = a.data_emissione.localeCompare(b.data_emissione);
        break;
      case "cliente":
        cmp = a.cliente_label.localeCompare(b.cliente_label, "it");
        break;
      case "totale":
        cmp = a.totale - b.totale;
        break;
      case "residuo":
        cmp = a.residuo - b.residuo;
        break;
      case "scadenza":
        cmp = (a.data_scadenza ?? "").localeCompare(b.data_scadenza ?? "");
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return cmp * dir;
  });
}

export function buildInvoiceListContextMaps(
  links: readonly InvoiceLinkRow[],
): Map<string, FatturazioneListRowContext> {
  const byInvoice = new Map<string, { links: InvoiceLinkRow[] }>();
  for (const link of links) {
    const list = byInvoice.get(link.invoice_id) ?? { links: [] };
    list.links.push(link);
    byInvoice.set(link.invoice_id, list);
  }
  const out = new Map<string, FatturazioneListRowContext>();
  for (const [id, { links: invLinks }] of byInvoice) {
    out.set(id, {
      links: invLinks,
      snapshotPiva: "",
      preventivoNums: invLinks.filter((l) => l.source_type === "preventivo").map((l) => l.source_id.slice(0, 8)).join(" "),
    });
  }
  return out;
}

export function invoiceListContextForRow(
  row: InvoiceRow,
  links: readonly InvoiceLinkRow[],
): FatturazioneListRowContext {
  const invLinks = links.filter((l) => l.invoice_id === row.id);
  const snap = row.customer_snapshot && typeof row.customer_snapshot === "object" ? row.customer_snapshot : {};
  const piva = typeof (snap as Record<string, unknown>).partita_iva === "string" ? String((snap as Record<string, unknown>).partita_iva) : "";
  return {
    links: invLinks,
    snapshotPiva: piva,
    preventivoNums: invLinks.filter((l) => l.source_type === "preventivo").map((l) => l.source_id.slice(0, 8)).join(" "),
  };
}
