"use client";

import { GlobalSelect } from "@/components/gestionale/global-input";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { LavorazioniReportFilters } from "@/lib/report/lavorazioni-work-orders";
import { dsInput } from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";

const PRIORITA_OPTIONS: { value: PrioritaLav | ""; label: string }[] = [
  { value: "", label: "Tutte le priorità" },
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
];

export function ReportLavorazioniFilters({
  filters,
  statoOptions,
  onChange,
}: {
  filters: LavorazioniReportFilters;
  statoOptions: { id: string; label: string }[];
  onChange: (next: LavorazioniReportFilters) => void;
}) {
  return (
    <div className="flex min-w-0 items-end gap-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 flex-nowrap sm:flex-wrap">
      <label className="min-w-0 min-w-[10rem] flex-1">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Cliente
        </span>
        <input
          type="search"
          className={`${dsInput} w-full text-sm`}
          placeholder="Filtra per cliente…"
          value={filters.clienteQ}
          onChange={(e) => onChange({ ...filters, clienteQ: e.target.value })}
        />
      </label>
      <label className="min-w-[9rem]" htmlFor="report-lav-filter-priorita">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Priorità
        </span>
        <GlobalSelect
          id="report-lav-filter-priorita"
          variant="filter"
          selectOnly
          strictFromList
          inputClassName={`${globalInputFieldFilter} ${dsInput} w-full text-sm`}
          items={PRIORITA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={filters.priorita}
          onChange={(v) => onChange({ ...filters, priorita: v as PrioritaLav | "" })}
        />
      </label>
      <label className="min-w-[9rem]" htmlFor="report-lav-filter-stato">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Stato
        </span>
        <GlobalSelect
          id="report-lav-filter-stato"
          variant="filter"
          selectOnly
          strictFromList
          inputClassName={`${globalInputFieldFilter} ${dsInput} w-full text-sm`}
          items={[{ value: "", label: "Tutti gli stati" }, ...statoOptions.map((s) => ({ value: s.id, label: s.label }))]}
          value={filters.statoId}
          onChange={(v) => onChange({ ...filters, statoId: v })}
        />
      </label>
    </div>
  );
}
