"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleListTable, GestionaleListTableActionsHead } from "@/components/gestionale/global-table";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import { buildAgingSummary, openItemDaysOverdue, scadenziarioDebitItems } from "@/lib/fatturazione/aging-analytics";
import { openItemAbsRemaining } from "@/lib/fatturazione/open-items";
import { useFatturazioneOpenItemsQuery } from "@/src/hooks/gestionale/use-fatturazione-open-items-query";
import { FatturazioneTabSection } from "@/components/fatturazione/fatturazione-page-structure";
import { dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";
import {
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
} from "@/lib/ui/gestionale-list-table";
import { dsTableActionBtnPrimary } from "@/lib/ui/design-system";

export function FatturazioneScadenziarioSection({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { items, isInitialLoading } = useFatturazioneOpenItemsQuery();
  const debitItems = useMemo(() => scadenziarioDebitItems(items), [items]);
  const aging = useMemo(() => buildAgingSummary(items), [items]);

  if (isInitialLoading) return <FatturazioneTabSection mode="skeleton" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["0-30", "31-60", "61-90", "90+"] as const).map((bucket) => (
          <ShellCard key={bucket}>
            <p className={dsTypoSmall}>Scaduto {bucket} gg</p>
            <p className={`${dsTypoSectionTitle} mt-1 tabular-nums`}>{formatInvoiceMoney(aging[bucket].total)}</p>
            <p className={`${dsTypoSmall} mt-1`}>{aging[bucket].count} partite</p>
          </ShellCard>
        ))}
      </div>
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Partite aperte</h2>
        <GestionaleListTable
          wrapClassName="mt-4"
          headRow={
            <>
              <th className={gestionaleListTableTd}>Documento</th>
              <th className={gestionaleListTableTd}>Scadenza</th>
              <th className={`${gestionaleListTableTd} text-right`}>Residuo</th>
              <th className={`${gestionaleListTableTd} text-right`}>Giorni</th>
              <GestionaleListTableActionsHead />
            </>
          }
          empty={debitItems.length === 0}
          emptyMessage="Nessuna partita in scadenza."
          colSpan={5}
        >
          {debitItems.map((row) => (
            <tr key={row.id} className={gestionaleListTableRowClass}>
              <td className={gestionaleListTableTd}>{row.document_number ?? "—"}</td>
              <td className={gestionaleListTableTd}>{row.due_date ?? "—"}</td>
              <td className={`${gestionaleListTableTd} text-right tabular-nums`}>
                {formatInvoiceMoney(openItemAbsRemaining(row))}
              </td>
              <td className={`${gestionaleListTableTd} text-right tabular-nums`}>
                {openItemDaysOverdue(row.due_date)}
              </td>
              <td className={gestionaleListTableTdAzioni}>
                {row.invoice_id ? (
                  <button type="button" className={dsTableActionBtnPrimary} onClick={() => onOpenInvoice(row.invoice_id!)}>
                    Fattura
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </GestionaleListTable>
      </ShellCard>
    </div>
  );
}
