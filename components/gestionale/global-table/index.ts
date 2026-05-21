/**
 * Sistema tabella globale CAB Gestionale.
 * **Master:** layout lista Lavorazioni — `GestionaleListTable` + `@/lib/ui/gestionale-list-table`.
 */

export { GlobalTable, type GlobalTableProps } from "@/components/gestionale/global-table/global-table";
export {
  GestionaleListTable,
  GestionaleListTableRow,
  GestionaleListTableActionsHead,
  GestionaleListTableMobileEmpty,
  type GestionaleListTableProps,
} from "@/components/gestionale/global-table/gestionale-list-table-shell";
export {
  GlobalTableHead,
  GlobalTableSortTh,
  GlobalTableHeadLabel,
  cycleGestionaleSort,
  gestionaleTableTheadClass,
  GestionaleSortTh,
  GestionaleTableHeadLabel,
  type GlobalTableSortPhase,
  type GestionaleSortPhase,
} from "@/components/gestionale/global-table/global-table-header";

export {
  globalTableTheadClass,
  globalTableThCell,
  globalTableThCellChipInset,
  globalTableThLabel,
  globalTableSortLabelStack,
  globalTableSortLabelStackLine,
  globalTableLabelIngressoLines,
  globalTableLabelIdentificazioneLines,
  globalTableRow,
  globalTableEmptyCell,
  globalTableWrap,
  globalTableWrapInset,
  globalTableTbodyInset,
  globalTableHeadEdgeInset,
  globalTableTdBody,
  globalTableTdActions,
  globalTableBase,
  globalTableFixed,
  cycleGlobalTableSort,
} from "@/lib/ui/global-table";
