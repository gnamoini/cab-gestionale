"use client";

import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { LavorazioniReportFilters } from "@/lib/report/lavorazioni-work-orders";
import { dsInput } from "@/lib/ui/design-system";

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
      <label className="min-w-[10rem] flex-1">
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
      <label className="min-w-[9rem]">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Priorità
        </span>
        <select
          className={`${dsInput} w-full text-sm`}
          value={filters.priorita}
          onChange={(e) => onChange({ ...filters, priorita: e.target.value as PrioritaLav | "" })}
        >
          {PRIORITA_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[9rem]">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Stato
        </span>
        <select
          className={`${dsInput} w-full text-sm`}
          value={filters.statoId}
          onChange={(e) => onChange({ ...filters, statoId: e.target.value })}
        >
          <option value="">Tutti gli stati</option>
          {statoOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
