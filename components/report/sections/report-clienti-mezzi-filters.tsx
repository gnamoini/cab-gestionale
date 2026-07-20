"use client";

import { reportSectionGroupDescClass } from "@/components/report/report-ui-tokens";

export type ReportClientiMezziFiltersState = {
  clienteQ: string;
  soloCritici: boolean;
};

export function ReportClientiMezziFilters({
  filters,
  onChange,
}: {
  filters: ReportClientiMezziFiltersState;
  onChange: (next: ReportClientiMezziFiltersState) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
        <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Filtra cliente</span>
        <input
          type="search"
          value={filters.clienteQ}
          onChange={(e) => onChange({ ...filters, clienteQ: e.target.value })}
          placeholder="Nome cliente…"
          className="h-9 rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-sm text-[color:var(--cab-text)]"
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 pt-0 sm:pt-5">
        <input
          type="checkbox"
          checked={filters.soloCritici}
          onChange={(e) => onChange({ ...filters, soloCritici: e.target.checked })}
          className="h-4 w-4 rounded border-[color:var(--cab-border)]"
        />
        <span className="text-sm text-[color:var(--cab-text)]">Solo mezzi critici</span>
      </label>
      <p className={`sm:pt-5 ${reportSectionGroupDescClass}`}>Filtri locali alla sezione flotta.</p>
    </div>
  );
}
