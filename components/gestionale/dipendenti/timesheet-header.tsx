"use client";

import { Tooltip } from "@/components/ui";
import { useMemo } from "react";
import type { DipendenteTimesheetEmployeeRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
import { buildTimesheetYearSelectOptions } from "@/lib/dipendenti/timesheet-available-periods";
import {
  dateYmdFromDate,
  monthKeyFromParts,
  monthOptionsForYear,
  parseMonthKey,
  setMonthKeyParts,
  shiftDayDate,
  shiftMonthKey,
  shiftWeekAnchor,
  type TimesheetPeriodMode,
} from "@/lib/dipendenti/timesheet-month";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { ShellCard } from "@/components/gestionale/shell-card";
import { PageToolbarResultCount } from "@/components/design-system/page-toolbar";
import { GlobalLoadingSpinner } from "@/components/design-system/loading";
import {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupMetaRow,
  ToolbarGroupPrimaryRow,
} from "@/components/design-system/toolbar-group";
import {
  dsInput,
  dsPageToolbarBtn,
  dsPageToolbarMetaChip,
  dsTypoSmall,
} from "@/lib/ui/design-system";

/**
 * Azioni affiancate nella toolbar mese: stesso padding e hover via bordo
 * (il ring di `dsPageToolbarBtn` su una sola cella crea asimmetria visiva).
 */
const timesheetMonthActionBtnClass = [
  dsPageToolbarBtn,
  "w-full min-w-0 flex-1 whitespace-nowrap px-2.5 sm:px-3",
  "isolate",
  "ring-0 hover:ring-0",
  "hover:border-[color:var(--cab-border-strong)]",
  "hover:shadow-[var(--cab-shadow-sm)]",
].join(" ");

function TimesheetPeriodNav({
  periodLabel,
  onPrevious,
  onNext,
}: {
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Navigazione periodo">
      <button type="button" className={dsPageToolbarBtn} onClick={onPrevious} aria-label="Periodo precedente">
        ←
      </button>
      <span className="min-w-[9rem] px-1 text-center text-sm font-medium tabular-nums text-[color:var(--cab-text)]">
        {periodLabel}
      </span>
      <button type="button" className={dsPageToolbarBtn} onClick={onNext} aria-label="Periodo successivo">
        →
      </button>
    </div>
  );
}

export function TimesheetHeader({
  periodMode,
  monthKey,
  onMonthKey,
  weekAnchor,
  onWeekAnchor,
  dayDate,
  onDayDate,
  employees,
  filterEmployeeId,
  onFilterEmployeeId,
  saveStatus,
  showBackgroundSync,
  onGoToToday,
  onFillToday8h,
  fillToday8hPending,
  fillToday8hDisabled,
  fillToday8hDisabledReason,
  monthKeysWithData = [],
}: {
  periodMode: TimesheetPeriodMode;
  monthKey: TimesheetMonthKey;
  onMonthKey: (k: TimesheetMonthKey) => void;
  weekAnchor: string;
  onWeekAnchor: (ymd: string) => void;
  dayDate: string;
  onDayDate: (ymd: string) => void;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  onFilterEmployeeId: (id: string) => void;
  saveStatus: "idle" | "pending" | "saved" | "error";
  /** Solo sync in background a pagina già caricata; il primo caricamento usa skeleton/error. */
  showBackgroundSync?: boolean;
  onGoToToday: () => void;
  onFillToday8h?: () => void;
  fillToday8hPending?: boolean;
  fillToday8hDisabled?: boolean;
  fillToday8hDisabledReason?: string;
  monthKeysWithData?: readonly TimesheetMonthKey[];
}) {
  const { year, month } = parseMonthKey(monthKey);
  const yearItems = useMemo(
    () =>
      buildTimesheetYearSelectOptions(monthKeysWithData, year).map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    [monthKeysWithData, year],
  );
  const monthItems = monthOptionsForYear(year).map((o) => ({
    value: String(o.value),
    label: o.label,
  }));

  const employeeItems = useMemo(
    () => [
      { value: "", label: "Tutti i dipendenti" },
      ...employees.map((e) => ({
        value: e.id,
        label: e.in_settings ? e.display_name : `${e.display_name} (storico — non in addetti)`,
      })),
    ],
    [employees],
  );

  const filtersActive = Boolean(filterEmployeeId);
  const filteredCount = filterEmployeeId ? 1 : employees.length;

  const saveLabel =
    saveStatus === "pending"
      ? "Salvataggio in corso…"
      : saveStatus === "saved"
        ? "Salvato"
        : saveStatus === "error"
          ? "Errore salvataggio"
          : null;

  const saveClass =
    saveStatus === "error"
      ? "text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]"
      : saveStatus === "saved"
        ? "text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]"
        : "text-[color:var(--cab-text-muted)]";

  const periodLabel =
    periodMode === "week" ? `Settimana · ${weekAnchor}` : `Giorno · ${dayDate}`;

  const goPreviousPeriod = () => {
    if (periodMode === "week") onWeekAnchor(shiftWeekAnchor(weekAnchor, -1));
    else onDayDate(shiftDayDate(dayDate, -1));
  };

  const goNextPeriod = () => {
    if (periodMode === "week") onWeekAnchor(shiftWeekAnchor(weekAnchor, 1));
    else onDayDate(shiftDayDate(dayDate, 1));
  };

  const filterLabelClass = `${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] pointer-events-none select-none`;

  return (
    <ShellCard>
      <section aria-label="Filtri timesheet" className="min-w-0">
        <ToolbarGroup>
          <ToolbarGroupBody>
            <ToolbarGroupPrimaryRow className="items-end gap-2 sm:flex-nowrap sm:justify-start">
              {periodMode !== "month" ? (
                <TimesheetPeriodNav
                  periodLabel={periodLabel}
                  onPrevious={goPreviousPeriod}
                  onNext={goNextPeriod}
                />
              ) : null}
              <div
                className={`grid min-w-0 w-full flex-1 grid-cols-1 gap-2 ${periodMode === "month" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Anno</span>
                  <GlobalSelect
                    selectOnly
                    exclusiveGroup="dipendenti-timesheet-filters"
                    value={String(year)}
                    onChange={(v) => onMonthKey(setMonthKeyParts(monthKey, Number(v), month))}
                    items={yearItems}
                    aria-label="Seleziona anno"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Mese</span>
                  <GlobalSelect
                    selectOnly
                    preserveItemOrder
                    exclusiveGroup="dipendenti-timesheet-filters"
                    value={String(month)}
                    onChange={(v) => onMonthKey(monthKeyFromParts(year, Number(v)))}
                    items={monthItems}
                    aria-label="Seleziona mese"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Dipendente</span>
                  <GlobalSelect
                    selectOnly
                    preserveItemOrder
                    exclusiveGroup="dipendenti-timesheet-filters"
                    value={filterEmployeeId}
                    onChange={onFilterEmployeeId}
                    items={employeeItems}
                    placeholder="Tutti i dipendenti"
                    aria-label="Seleziona dipendente"
                  />
                </div>
                {periodMode === "day" ? (
                  <div className="flex min-w-0 flex-col gap-1 sm:col-span-3">
                    <span className={filterLabelClass}>Giorno</span>
                    <input
                      type="date"
                      className={dsInput}
                      value={dayDate}
                      onChange={(e) => onDayDate(e.target.value || dayDate)}
                      aria-label="Seleziona giorno"
                    />
                  </div>
                ) : null}
                {periodMode === "month" ? (
                  <div
                    className="flex min-w-0 flex-col gap-1"
                    role="group"
                    aria-label="Azioni giorno corrente"
                  >
                    <span className={`${filterLabelClass} hidden min-w-0 sm:block invisible`} aria-hidden="true">
                      &#8203;
                    </span>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                      <Tooltip content={"Vai al mese corrente e evidenzia la colonna di oggi"}><button type="button" className={timesheetMonthActionBtnClass} onClick={onGoToToday}>
                        Oggi
                      </button></Tooltip>
                      {onFillToday8h ? (
                        <Tooltip content={fillToday8hDisabled && fillToday8hDisabledReason
                              ? fillToday8hDisabledReason
                              : "Imposta 8 ore ordinarie per oggi su tutte le celle vuote degli addetti visibili"}><button type="button" className={timesheetMonthActionBtnClass} onClick={onFillToday8h} disabled={fillToday8hDisabled || fillToday8hPending} aria-busy={fillToday8hPending}>
                          <span className="sm:hidden">{fillToday8hPending ? "…" : "8h oggi"}</span>
                          <span className="hidden min-w-0 truncate sm:inline">
                            {fillToday8hPending ? "Salvataggio…" : "8h per tutti (oggi)"}
                          </span>
                        </button></Tooltip>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </ToolbarGroupPrimaryRow>
            <ToolbarGroupMetaRow className="!justify-start gap-2">
              <PageToolbarResultCount
                count={filteredCount}
                filtersActive={filtersActive}
                singularLabel="dipendente"
                pluralLabel="dipendenti"
                onFilterReset={filtersActive ? () => onFilterEmployeeId("") : undefined}
              />
              {saveLabel ? (
                <p role="status" aria-live="polite" className={`text-xs font-medium ${saveClass}`}>
                  {saveLabel}
                </p>
              ) : null}
              {showBackgroundSync ? (
                <span className={dsPageToolbarMetaChip} role="status" aria-live="polite">
                  <GlobalLoadingSpinner size="sm" className="shrink-0" label="Registro in aggiornamento" />
                  <span>Registro in aggiornamento</span>
                </span>
              ) : null}
            </ToolbarGroupMetaRow>
          </ToolbarGroupBody>
        </ToolbarGroup>
      </section>
    </ShellCard>
  );
}

export function defaultWeekAnchor(monthKey: TimesheetMonthKey): string {
  return `${monthKey}-01`;
}

export function defaultDayDate(monthKey: TimesheetMonthKey): string {
  const today = dateYmdFromDate(new Date());
  return today.startsWith(monthKey) ? today : `${monthKey}-01`;
}
