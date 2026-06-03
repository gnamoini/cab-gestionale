"use client";

import { useMemo } from "react";
import type { DipendenteTimesheetEmployeeRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
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
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Navigazione periodo">
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
}) {
  const { year, month } = parseMonthKey(monthKey);
  const yearItems = yearOptions(6).map((o) => ({ value: String(o.value), label: o.label }));
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

  const filterLabelClass = `${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`;

  return (
    <ShellCard>
      <section aria-label="Filtri timesheet" className="min-w-0">
        <ToolbarGroup>
          <ToolbarGroupBody>
            <ToolbarGroupPrimaryRow className="!flex-wrap items-end gap-3">
              {periodMode !== "month" ? (
                <TimesheetPeriodNav
                  periodLabel={periodLabel}
                  onPrevious={goPreviousPeriod}
                  onNext={goNextPeriod}
                />
              ) : null}
              <div
                className={`grid min-w-0 w-full flex-1 grid-cols-1 gap-3 ${periodMode === "month" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Anno</span>
                  <GlobalSelect
                    selectOnly
                    value={String(year)}
                    onChange={(v) => onMonthKey(setMonthKeyParts(monthKey, Number(v), month))}
                    items={yearItems}
                    aria-label="Seleziona anno"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Mese</span>
                  <GlobalSelect
                    selectOnly
                    value={String(month)}
                    onChange={(v) => onMonthKey(monthKeyFromParts(year, Number(v)))}
                    items={monthItems}
                    aria-label="Seleziona mese"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={filterLabelClass}>Dipendente</span>
                  <GlobalSelect
                    selectOnly
                    value={filterEmployeeId}
                    onChange={onFilterEmployeeId}
                    items={employeeItems}
                    placeholder="Tutti i dipendenti"
                    aria-label="Seleziona dipendente"
                  />
                </label>
                {periodMode === "day" ? (
                  <label className="flex min-w-0 flex-col gap-1 sm:col-span-3">
                    <span className={filterLabelClass}>Giorno</span>
                    <input
                      type="date"
                      className={dsInput}
                      value={dayDate}
                      onChange={(e) => onDayDate(e.target.value || dayDate)}
                      aria-label="Seleziona giorno"
                    />
                  </label>
                ) : null}
                {periodMode === "month" ? (
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${filterLabelClass} hidden sm:block invisible`} aria-hidden="true">
                      &#8203;
                    </span>
                    <button
                      type="button"
                      className={`${dsPageToolbarBtn} w-full min-w-0 px-3`}
                      onClick={onGoToToday}
                      title="Vai al mese corrente e evidenzia la colonna di oggi"
                    >
                      Oggi
                    </button>
                  </label>
                ) : null}
              </div>
            </ToolbarGroupPrimaryRow>
            <ToolbarGroupMetaRow>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
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
              </div>
            </ToolbarGroupMetaRow>
          </ToolbarGroupBody>
        </ToolbarGroup>
      </section>
    </ShellCard>
  );
}

function yearOptions(count: number): { value: number; label: string }[] {
  const startYear = new Date().getFullYear();
  const out: { value: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear - i;
    out.push({ value: y, label: String(y) });
  }
  return out;
}

export function defaultWeekAnchor(monthKey: TimesheetMonthKey): string {
  return `${monthKey}-01`;
}

export function defaultDayDate(monthKey: TimesheetMonthKey): string {
  const today = dateYmdFromDate(new Date());
  return today.startsWith(monthKey) ? today : `${monthKey}-01`;
}
