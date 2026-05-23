"use client";

import { isValidElement, type ReactNode } from "react";
import { dsScrollbar } from "@/lib/ui/design-system";
import {
  globalTableBase,
  globalTableEmptyCell,
  globalTableFixed,
  globalTableRow,
  globalTableWrap,
  globalTableTbodyInset,
} from "@/lib/ui/global-table";
import { GlobalTableHead } from "@/components/gestionale/global-table/global-table-header";

export type GlobalTableProps = {
  /** Celle `<th>` dentro la riga header (wrappa automaticamente `<thead><tr>`). */
  headRow: ReactNode;
  /** Righe `<tr>` del body. */
  children: ReactNode;
  colgroup?: ReactNode;
  /** `table-fixed` + colgroup consigliato per liste dense. */
  fixed?: boolean;
  className?: string;
  wrapClassName?: string;
  /** Es. `hidden md:block` per desktop-only accanto a card mobile. */
  visibilityClass?: string;
  stickyHead?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  colSpan?: number;
};

function normalizeColgroup(node: ReactNode): ReactNode {
  if (node == null) return null;
  if (isValidElement(node) && node.type === "colgroup") return node;
  return <colgroup>{node}</colgroup>;
}

/**
 * Shell tabella gestionale — design globale (header Preventivi).
 * Logica sorting/filtri/paginazione resta nelle pagine; qui solo layout/UI.
 */
export function GlobalTable({
  headRow,
  children,
  colgroup,
  fixed = true,
  className = "",
  wrapClassName = "",
  visibilityClass = "",
  stickyHead = false,
  empty,
  emptyMessage = "Nessun risultato.",
  colSpan = 1,
}: GlobalTableProps) {
  const tableClass = `${fixed ? globalTableFixed : globalTableBase} ${className}`.trim();
  return (
    <div
      className={`${globalTableWrap} ${dsScrollbar} ${visibilityClass} ${wrapClassName}`.trim()}
    >
      <table className={tableClass}>
        {normalizeColgroup(colgroup)}
        <GlobalTableHead sticky={stickyHead}>{headRow}</GlobalTableHead>
        <tbody className={globalTableTbodyInset}>
          {empty ? (
            <tr className={globalTableRow}>
              <td colSpan={colSpan} className={globalTableEmptyCell}>
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
