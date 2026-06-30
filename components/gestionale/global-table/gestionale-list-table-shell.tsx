"use client";

import "./gestionale-list-table.css";

import type { ReactNode } from "react";
import {
  GlobalTable,
  type GlobalTableProps,
  type GlobalTableVirtualRows,
} from "@/components/gestionale/global-table/global-table";

export type { GlobalTableVirtualRows };
import { GlobalTableHeadLabel } from "@/components/gestionale/global-table/global-table-header";
import {
  gestionaleListTableMasterWrapClass,
  gestionaleListTableRowClass,
  gestionaleListTableThAzioni,
} from "@/lib/ui/gestionale-list-table";
import { GESTIONALE_LIST_MOBILE_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";

export type GestionaleListTableProps = GlobalTableProps & {
  /**
   * `true` (default): wrap con scroll scope Lavorazioni (`lavorazioni-scroll-scope …`).
   * `false`: solo card + scrollbar (es. Preventivi con `mt-4` aggiuntivo).
   */
  masterScrollScope?: boolean;
};

/**
 * Shell tabella lista — eredita il layout della pagina Lavorazioni.
 * Delega a `GlobalTable` applicando il wrap master salvo override esplicito.
 */
export function GestionaleListTable({
  masterScrollScope = true,
  wrapClassName = "",
  className = "",
  ...props
}: GestionaleListTableProps) {
  const masterWrap = masterScrollScope ? gestionaleListTableMasterWrapClass : "";
  const wrap = [masterWrap, wrapClassName].filter(Boolean).join(" ");
  return <GlobalTable wrapClassName={wrap} className={className} {...props} />;
}

export function GestionaleListTableRow({
  className = "",
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <tr id={id} className={[gestionaleListTableRowClass, className].filter(Boolean).join(" ")}>
      {children}
    </tr>
  );
}

/** Header colonna Azioni — titolo a destra, sticky durante lo scroll orizzontale. */
export function GestionaleListTableActionsHead() {
  return <GlobalTableHeadLabel label="Azioni" align="right" thClassName={gestionaleListTableThAzioni} />;
}

export function GestionaleListTableMobileEmpty({ message }: { message: string }) {
  return (
    <p className={`rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
      {message}
    </p>
  );
}
