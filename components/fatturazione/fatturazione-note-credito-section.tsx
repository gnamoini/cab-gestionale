"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleListTable, GestionaleListTableActionsHead } from "@/components/gestionale/global-table";
import {
  FatturaStatusBadge,
  formatInvoiceDate,
  formatInvoiceMoney,
} from "@/components/fatturazione/fattura-status-badge";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import { LoadingFatturazioneListSkeleton } from "@/components/design-system";
import { dsTableActionBtnPrimary, dsTableActionsGroup, dsTypoSectionTitle } from "@/lib/ui/design-system";
import {
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdPill,
} from "@/lib/ui/gestionale-list-table";

export function FatturazioneNoteCreditoSection({
  invoices,
  isLoading,
  onOpenDetail,
}: {
  invoices: InvoiceRow[];
  isLoading: boolean;
  onOpenDetail: (id: string) => void;
}) {
  const creditNotes = useMemo(
    () => invoices.filter((i) => i.document_type === "nota_credito"),
    [invoices],
  );

  if (isLoading) return <LoadingFatturazioneListSkeleton withToolbar={false} />;

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Note di credito</h2>
      <GestionaleListTable
        wrapClassName="mt-4"
        headRow={
          <>
            <th className={gestionaleListTableTd}>N.</th>
            <th className={gestionaleListTableTd}>Data</th>
            <th className={gestionaleListTableTd}>Cliente</th>
            <th className={`${gestionaleListTableTd} text-right`}>Totale</th>
            <th className={gestionaleListTableTd}>Stato</th>
            <GestionaleListTableActionsHead />
          </>
        }
        empty={creditNotes.length === 0}
        emptyMessage="Nessuna nota di credito."
        colSpan={6}
      >
        {creditNotes.map((row) => (
          <tr key={row.id} className={gestionaleListTableRowClass}>
            <td className={gestionaleListTableTd}>{invoiceDisplayNumber(row)}</td>
            <td className={gestionaleListTableTd}>{formatInvoiceDate(row.data_emissione)}</td>
            <td className={gestionaleListTableTd}>{row.cliente_label}</td>
            <td className={`${gestionaleListTableTd} text-right tabular-nums`}>{formatInvoiceMoney(row.totale)}</td>
            <td className={gestionaleListTableTdPill}>
              <FatturaStatusBadge status={row.status} />
            </td>
            <td className={gestionaleListTableTdAzioni}>
              <div className={dsTableActionsGroup}>
                <button type="button" className={dsTableActionBtnPrimary} onClick={() => onOpenDetail(row.id)}>
                  Dettaglio
                </button>
              </div>
            </td>
          </tr>
        ))}
      </GestionaleListTable>
    </ShellCard>
  );
}
