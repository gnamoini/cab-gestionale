"use client";

import type { ReactNode } from "react";
import { GestionaleListTable } from "@/components/gestionale/global-table";
import { GESTIONALE_LIST_DESKTOP_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";

export type LavorazioniDesktopTableShellProps = {
  visibilityClass?: string;
  className?: string;
  colgroup: ReactNode;
  headRow: ReactNode;
  empty: boolean;
  emptyMessage: string;
  colSpan: number;
  virtualRows: {
    rowCount: number;
    renderRow: (index: number) => ReactNode;
    estimateRowHeight: number;
  };
};

/** Shell tabella desktop Lavorazioni — presentational, dati/hook restano nel parent. */
export function LavorazioniDesktopTableShell({
  visibilityClass = GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  className,
  colgroup,
  headRow,
  empty,
  emptyMessage,
  colSpan,
  virtualRows,
}: LavorazioniDesktopTableShellProps) {
  return (
    <GestionaleListTable
      visibilityClass={visibilityClass}
      className={className}
      colgroup={colgroup}
      headRow={headRow}
      empty={empty}
      emptyMessage={emptyMessage}
      colSpan={colSpan}
      virtualRows={virtualRows}
    >
      {null}
    </GestionaleListTable>
  );
}
