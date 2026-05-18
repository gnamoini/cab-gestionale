"use client";

import type { ReactNode } from "react";
import {
  dsScrollbar,
  dsTable,
  dsTableEmptyCell,
  dsTableFixed,
  dsTableHead,
  dsTableRow,
  dsTableWrapDesktopFit,
} from "@/lib/ui/design-system";

export type DataTableProps = {
  children: ReactNode;
  /** Intestazione `<thead>` completa. */
  head: ReactNode;
  /** Usa layout `table-fixed` (consigliato con `<colgroup>`). */
  fixed?: boolean;
  className?: string;
  wrapClassName?: string;
  /** Messaggio se `empty` e nessuna riga nel body. */
  empty?: boolean;
  emptyMessage?: string;
  colSpan?: number;
};

/**
 * Contenitore tabella unificato: compatto, scroll orizzontale solo sotto xl, token globali.
 */
export function DataTable({
  children,
  head,
  fixed = true,
  className = "",
  wrapClassName = "",
  empty,
  emptyMessage = "Nessun risultato.",
  colSpan = 1,
}: DataTableProps) {
  const tableClass = fixed ? dsTableFixed : dsTable;
  return (
    <div className={`${dsTableWrapDesktopFit} ${dsScrollbar} ${wrapClassName}`.trim()}>
      <table className={`${tableClass} ${className}`.trim()}>
        {head}
        <tbody>
          {empty ? (
            <tr className={dsTableRow}>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export {
  dsTableHead,
  dsTableRow,
  dsTableEmptyCell,
  dsTableTdCompact,
  dsTableTdActions,
  dsTableActionsGroup,
  dsTableActionsGroupStart,
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
