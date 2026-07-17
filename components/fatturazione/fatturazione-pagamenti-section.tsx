"use client";

import { useMemo, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleListTable, GestionaleListTableActionsHead } from "@/components/gestionale/global-table";
import { FatturaMultiPaymentModal } from "@/components/fatturazione/fattura-multi-payment-modal";
import { formatInvoiceDate, formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import { useFatturazioneOpenItemsQuery } from "@/src/hooks/gestionale/use-fatturazione-open-items-query";
import { useFatturazionePaymentsQuery } from "@/src/hooks/gestionale/use-fatturazione-payments-query";
import type { CustomerPaymentRow } from "@/src/types/supabase-tables";
import { LoadingFatturazioneListSkeleton } from "@/components/design-system";
import { dsPageToolbarBtn, dsTypoSectionTitle } from "@/lib/ui/design-system";
import { gestionaleListTableRowClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export function FatturazionePagamentiSection({ canWrite = false }: { canWrite?: boolean }) {
  const { payments, isLoading, refetch } = useFatturazionePaymentsQuery();
  const [multiOpen, setMultiOpen] = useState(false);
  const openItemsQ = useFatturazioneOpenItemsQuery(multiOpen);
  const unallocated = useMemo(
    () => payments.filter((p: CustomerPaymentRow) => p.allocation_status !== "allocated"),
    [payments],
  );

  if (isLoading) return <LoadingFatturazioneListSkeleton withToolbar={false} />;

  return (
    <div className="space-y-4">
      <ShellCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={dsTypoSectionTitle}>Pagamenti da allocare ({unallocated.length})</h2>
          {canWrite ? (
            <button type="button" className={dsPageToolbarBtn} onClick={() => setMultiOpen(true)}>
              Incasso multiplo
            </button>
          ) : null}
        </div>
        <GestionaleListTable
          wrapClassName="mt-4"
          headRow={
            <>
              <th className={gestionaleListTableTd}>Data</th>
              <th className={`${gestionaleListTableTd} text-right`}>Importo</th>
              <th className={gestionaleListTableTd}>Metodo</th>
              <th className={gestionaleListTableTd}>Stato allocazione</th>
              <GestionaleListTableActionsHead />
            </>
          }
          empty={unallocated.length === 0}
          emptyMessage="Nessun pagamento in attesa di allocazione."
          colSpan={5}
        >
          {unallocated.map((row) => (
            <tr key={row.id} className={gestionaleListTableRowClass}>
              <td className={gestionaleListTableTd}>{formatInvoiceDate(row.data)}</td>
              <td className={`${gestionaleListTableTd} text-right tabular-nums`}>{formatInvoiceMoney(row.importo)}</td>
              <td className={gestionaleListTableTd}>{row.metodo}</td>
              <td className={gestionaleListTableTd}>{row.allocation_status}</td>
              <td className={gestionaleListTableTd} />
            </tr>
          ))}
        </GestionaleListTable>
      </ShellCard>
      {multiOpen ? (
        <FatturaMultiPaymentModal
          openItems={openItemsQ.items}
          onRequestClose={() => setMultiOpen(false)}
          onSaved={() => {
            void refetch();
            void openItemsQ.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
