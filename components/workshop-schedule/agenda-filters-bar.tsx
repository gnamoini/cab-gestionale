"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/design-system";
import type { WorkshopScheduleFilters } from "@/lib/workshop-schedule/types";
import {
  WORKSHOP_EVENT_TYPES,
  WORKSHOP_PLANNING_STATUSES,
  WORKSHOP_PRIORITIES,
} from "@/lib/workshop-schedule/types";
import { PLANNING_STATUS_LABELS } from "@/lib/workshop-schedule/types";
import { EVENT_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/workshop-schedule/agenda-ui-labels";
import {
  dsBadgeNeutral,
  dsFocus,
  dsTypoCaption,
  gestionaleSelectFilterClass,
} from "@/lib/ui/design-system";

function activeFilterCount(filters: WorkshopScheduleFilters): number {
  let n = 0;
  if (filters.eventTypes?.length) n += 1;
  if (filters.planningStatuses?.length) n += 1;
  if (filters.priorities?.length) n += 1;
  if (filters.withWorkOrder != null) n += 1;
  if (filters.workOrderId) n += 1;
  return n;
}

function FilterSelect({
  id,
  label,
  hint,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const select = (
    <select
      id={id}
      className={`${gestionaleSelectFilterClass} min-w-0 min-w-[8.5rem] max-w-[11rem] py-2 pl-3 pr-9 text-xs sm:text-sm`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={`${dsTypoCaption} font-semibold uppercase tracking-wide`}>
        {label}
      </label>
      {hint ? <Tooltip content={hint}>{select}</Tooltip> : select}
    </div>
  );
}

export function AgendaFiltersBar({
  filters,
  onChange,
  canWrite,
}: {
  filters: WorkshopScheduleFilters;
  onChange: (next: WorkshopScheduleFilters) => void;
  canWrite: boolean;
}) {
  const active = activeFilterCount(filters);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
        <FilterSelect
          id="agenda-filter-type"
          label="Tipo"
          value={filters.eventTypes?.[0] ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              eventTypes: v ? [v as (typeof WORKSHOP_EVENT_TYPES)[number]] : undefined,
            })
          }
        >
          <option value="">Tutti</option>
          {WORKSHOP_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="agenda-filter-status"
          label="Stato"
          hint="Stato di pianificazione — distinto dallo stato lavorazione"
          value={filters.planningStatuses?.[0] ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              planningStatuses: v ? [v as (typeof WORKSHOP_PLANNING_STATUSES)[number]] : undefined,
            })
          }
        >
          <option value="">Tutti</option>
          {WORKSHOP_PLANNING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PLANNING_STATUS_LABELS[s]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="agenda-filter-priority"
          label="Priorità"
          value={filters.priorities?.[0] ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              priorities: v ? [v as (typeof WORKSHOP_PRIORITIES)[number]] : undefined,
            })
          }
        >
          <option value="">Tutte</option>
          {WORKSHOP_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="agenda-filter-wo"
          label="Lavorazione"
          value={filters.withWorkOrder === true ? "yes" : filters.withWorkOrder === false ? "no" : ""}
          onChange={(v) =>
            onChange({
              ...filters,
              withWorkOrder: v === "yes" ? true : v === "no" ? false : undefined,
            })
          }
        >
          <option value="">Tutte</option>
          <option value="yes">Con lavorazione</option>
          <option value="no">Solo promemoria / blocchi</option>
        </FilterSelect>

        {active > 0 ? (
          <button
            type="button"
            className={`mb-0.5 self-end text-xs font-semibold text-[color:var(--cab-primary)] underline-offset-2 hover:underline ${dsFocus}`}
            onClick={() => onChange(filters.workOrderId ? { workOrderId: filters.workOrderId } : {})}
          >
            Azzera filtri ({active})
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {!canWrite ? (
          <Tooltip content="Il tuo profilo può consultare l'agenda ma non modificare le sessioni">
            <span className={dsBadgeNeutral}>Solo lettura</span>
          </Tooltip>
        ) : null}
        {filters.workOrderId ? (
          <Tooltip content="Filtro attivo dalla lavorazione collegata">
            <span className={dsBadgeNeutral}>Lavorazione selezionata</span>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
