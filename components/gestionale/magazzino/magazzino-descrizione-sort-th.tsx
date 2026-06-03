"use client";

import { GlobalTableSortIcon } from "@/components/gestionale/global-table/global-table-sort-icon";
import { dsFocus } from "@/lib/ui/design-system";
import {
  globalTableSortActive,
  globalTableSortButton,
  globalTableSortIdle,
  globalTableSortLabelSingle,
  globalTableThCell,
} from "@/lib/ui/global-table";
import type { SortKeyMagazzino } from "@/lib/magazzino/types";
import type { SortPhaseMagazzino } from "@/lib/magazzino/sort-order";

/** Eccezione documentata: due chiavi sort nella stessa colonna (Descrizione + Compatibilità). */
export function MagazzinoDescrizioneSortTh({
  sortColumn,
  sortPhase,
  onSort,
}: {
  sortColumn: SortKeyMagazzino | null;
  sortPhase: SortPhaseMagazzino;
  onSort: (k: SortKeyMagazzino) => void;
}) {
  const renderBtn = (label: string, columnKey: SortKeyMagazzino, compact?: boolean) => {
    const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
    const sortHint = active
      ? sortPhase === "asc"
        ? "ordinato crescente"
        : "ordinato decrescente"
      : "non ordinato";
    return (
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        aria-label={`${label}: ${sortHint}. Clic per cambiare ordinamento`}
        className={`${globalTableSortButton} w-full justify-start ${compact ? "text-[10px] font-semibold normal-case tracking-normal" : ""} ${dsFocus} ${
          active ? globalTableSortActive : globalTableSortIdle
        }`}
      >
        <span className={globalTableSortLabelSingle}>{label}</span>
        <GlobalTableSortIcon active={active} phase={sortPhase} />
      </button>
    );
  };

  return (
    <th className={`${globalTableThCell} min-w-0 align-top text-left`}>
      <div className="flex min-w-0 flex-col items-start gap-1">
        {renderBtn("Descrizione", "descrizione")}
        {renderBtn("Compatibilità", "compatibilitaMezzi", true)}
      </div>
    </th>
  );
}
