"use client";

import type { ReactNode } from "react";
import { GlobalTable } from "@/components/gestionale/global-table/global-table";

export type DataTableProps = {
  children: ReactNode;
  /** Celle `<th>` della riga header (il componente aggiunge `<thead><tr>`). */
  head: ReactNode;
  colgroup?: ReactNode;
  fixed?: boolean;
  className?: string;
  wrapClassName?: string;
  empty?: boolean;
  emptyMessage?: string;
  colSpan?: number;
};

/**
 * @deprecated Preferire `GlobalTable` da `@/components/gestionale/global-table`.
 * Wrapper sottile per API legacy (`head` = celle th).
 */
export function DataTable({
  children,
  head,
  colgroup,
  fixed = true,
  className = "",
  wrapClassName = "",
  empty,
  emptyMessage = "Nessun risultato.",
  colSpan = 1,
}: DataTableProps) {
  return (
    <GlobalTable
      headRow={head}
      colgroup={colgroup}
      fixed={fixed}
      className={className}
      wrapClassName={wrapClassName}
      empty={empty}
      emptyMessage={emptyMessage}
      colSpan={colSpan}
    >
      {children}
    </GlobalTable>
  );
}

export {
  dsTableHead,
  dsTableRow,
  dsTableEmptyCell,
  dsTableTdCompact,
  dsTableTdActions,
  dsTableActionsGroup,
  dsTableActionsGroupEnd,
  dsTableActionsGroupStart,
  dsTableActionBadge,
  dsTableActionBtnWithBadge,
  dsTableThActions,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnDanger,
  dsTableActionBtnInfo,
  dsTableActionBtnUndo,
  dsTableActionTextBtn,
  dsTableActionTextBtnPrimary,
  dsTableActionTextBtnDanger,
  dsTableActionGlyph,
  dsTableThSticky,
  dsTableCellTruncate,
} from "@/lib/ui/design-system";
