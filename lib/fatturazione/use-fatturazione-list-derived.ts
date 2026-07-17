"use client";

import { useMemo } from "react";
import type { GlobalTableSortPhase } from "@/components/gestionale/global-table";
import {
  buildInvoiceListContextMaps,
  invoiceRowMatchesPageFilters,
  sortInvoices,
  type FatturazioneListRowContext,
  type FatturazionePageFilters,
  type FatturazioneSortKey,
} from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { InvoiceLinkRow, InvoiceRow } from "@/src/types/supabase-tables";

function snapshotPivaFromRow(row: InvoiceRow): string {
  const snap = row.customer_snapshot && typeof row.customer_snapshot === "object" ? row.customer_snapshot : {};
  return typeof (snap as Record<string, unknown>).partita_iva === "string"
    ? String((snap as Record<string, unknown>).partita_iva)
    : "";
}

function contextForInvoice(
  row: InvoiceRow,
  contextByInvoiceId: Map<string, FatturazioneListRowContext>,
): FatturazioneListRowContext {
  const fromMap = contextByInvoiceId.get(row.id);
  if (fromMap) {
    return { ...fromMap, snapshotPiva: snapshotPivaFromRow(row) || fromMap.snapshotPiva };
  }
  return { links: [], snapshotPiva: snapshotPivaFromRow(row), preventivoNums: "" };
}

/** Single-pass link map + filtered/sorted lista fatture. */
export function useFatturazioneListDerived(
  invoices: readonly InvoiceRow[],
  links: readonly InvoiceLinkRow[],
  filters: FatturazionePageFilters,
  sortCol: FatturazioneSortKey | null,
  sortPhase: GlobalTableSortPhase,
) {
  const contextByInvoiceId = useMemo(() => buildInvoiceListContextMaps(links), [links]);

  const filtered = useMemo(() => {
    const rows = invoices.filter((inv) =>
      invoiceRowMatchesPageFilters(inv, contextForInvoice(inv, contextByInvoiceId), filters),
    );
    if (!sortCol) return rows;
    return sortInvoices(rows, sortCol, sortPhase === "asc");
  }, [contextByInvoiceId, filters, invoices, sortCol, sortPhase]);

  return { filtered, contextByInvoiceId };
}
