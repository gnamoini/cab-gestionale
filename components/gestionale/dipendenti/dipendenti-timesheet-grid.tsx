"use client";

import "@/components/gestionale/global-table/gestionale-list-table.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { employeeNameLines } from "@/lib/dipendenti/dipendenti-employee-display";
import { buildMonthDays, type TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { sumMonthTotalsList } from "@/lib/dipendenti/timesheet-kpi";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  TimesheetCellValue,
  TimesheetMonthKey,
  TimesheetMonthTotals,
} from "@/lib/dipendenti/types";
import { Tooltip } from "@/components/design-system";
import { DipendentiTimesheetCompactCell } from "@/components/gestionale/dipendenti/dipendenti-timesheet-compact-cell";
import {
  buildTimesheetCellTooltip,
  buildTimesheetEmployeeNameTooltip,
  formatTimesheetDayColumnTooltip,
  formatTimesheetFooterDayTooltip,
  formatTimesheetFooterMonthTooltip,
} from "@/lib/dipendenti/timesheet-cell-display";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  gestionaleListTableClass,
  gestionaleListTableMasterWrapClass,
} from "@/lib/ui/gestionale-list-table";
import { dsScrollbar } from "@/lib/ui/design-system";
import { globalTableThCell, globalTableThLabel } from "@/lib/ui/global-table";

/** Ombra solo sul corpo tabella quando si scrolla orizzontalmente — mai sull’header. */
const timesheetStickyColBodyShadow =
  "shadow-[4px_0_8px_-4px_color-mix(in_srgb,var(--cab-bg-app)_55%,transparent)]";

const timesheetTotalsColBorder = "border-l border-[color:var(--cab-border)]";

/** Colonna nome: corpo compatto; header con etichetta globale (truncate). */
const timesheetStickyNameCol = "min-w-[6.25rem] max-w-[9rem] w-[8.5rem]";

/** Stesso inset orizzontale della prima `<th>` (`globalTableHeadEdgeInset` + `pr-2.5`). */
const timesheetStickyNamePad =
  "py-2 pl-[calc(0.5rem+0.625rem)] pr-2.5 sm:pl-[calc(0.75rem+0.625rem)]";

const timesheetHeaderThBase = [
  globalTableThCell,
  globalTableThLabel,
  "bg-[var(--cab-surface-2)] py-2",
].join(" ");

/** Footer continuo: stesso sfondo ovunque, niente ombra sulla colonna sticky. */
const timesheetFooterTdBase =
  "border-t-2 border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] py-2 shadow-none";

const timesheetTableScrollClass = [
  gestionaleListTableMasterWrapClass,
  "timesheet-presenze-grid",
  "relative",
  dsScrollbar,
  "max-h-[min(70vh,40rem)] max-w-full overflow-auto",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)]",
].join(" ");

type TimesheetTodayRailBox = { left: number; top: number; width: number; height: number };

/** Cornice colonna «oggi» (sopra intestazione data → sotto footer), un solo overlay. */
function useTimesheetTodayColumnRail(
  scrollRef: RefObject<HTMLDivElement | null>,
  dateYmd: string | null,
  layoutKey: string,
): TimesheetTodayRailBox | null {
  const [box, setBox] = useState<TimesheetTodayRailBox | null>(null);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root || !dateYmd) {
      setBox(null);
      return;
    }

    const measure = () => {
      const header = root.querySelector(`thead th[data-timesheet-day="${dateYmd}"]`);
      if (!(header instanceof HTMLElement)) {
        setBox(null);
        return;
      }
      const footerCells = root.querySelectorAll(`tfoot td[data-timesheet-day="${dateYmd}"]`);
      const footerWork = footerCells[0];
      const footerAbsence = footerCells[footerCells.length - 1];
      const bottomEl =
        footerAbsence instanceof HTMLElement
          ? footerAbsence
          : footerWork instanceof HTMLElement
            ? footerWork
            : header;
      const rootRect = root.getBoundingClientRect();
      const topRect = header.getBoundingClientRect();
      const bottomRect = bottomEl.getBoundingClientRect();
      setBox({
        left: topRect.left - rootRect.left + root.scrollLeft,
        top: topRect.top - rootRect.top + root.scrollTop,
        width: topRect.width,
        height: bottomRect.bottom - topRect.top,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      root.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [scrollRef, dateYmd, layoutKey]);

  return box;
}

type TimesheetCrosshairTarget = {
  dateYmd: string | null;
  employeeId: string | null;
};

function clearTimesheetCrosshair(grid: HTMLDivElement | null): void {
  if (!grid) return;
  delete grid.dataset.timesheetColumnHover;
  delete grid.dataset.timesheetRowHover;
  grid.querySelectorAll("[data-timesheet-column-active]").forEach((el) => {
    el.removeAttribute("data-timesheet-column-active");
  });
  grid.querySelectorAll("[data-timesheet-row-active]").forEach((el) => {
    el.removeAttribute("data-timesheet-row-active");
  });
}

function timesheetRowHighlightSelector(employeeId: string): string {
  return [
    `tr[data-timesheet-employee-row="${employeeId}"]`,
    `td[data-timesheet-sticky-name][data-timesheet-employee-row="${employeeId}"]`,
    `td[data-timesheet-total][data-timesheet-employee-row="${employeeId}"]`,
  ].join(", ");
}

function setTimesheetCrosshair(grid: HTMLDivElement | null, target: TimesheetCrosshairTarget): void {
  if (!grid) return;
  const { dateYmd, employeeId } = target;

  if ((grid.dataset.timesheetColumnHover ?? "") !== (dateYmd ?? "")) {
    const prevCol = grid.dataset.timesheetColumnHover;
    if (prevCol) {
      grid.querySelectorAll(`[data-timesheet-day="${prevCol}"]`).forEach((el) => {
        el.removeAttribute("data-timesheet-column-active");
      });
    }
    if (dateYmd) {
      grid.dataset.timesheetColumnHover = dateYmd;
      grid.querySelectorAll(`[data-timesheet-day="${dateYmd}"]`).forEach((el) => {
        el.setAttribute("data-timesheet-column-active", "");
      });
    } else {
      delete grid.dataset.timesheetColumnHover;
    }
  }

  if ((grid.dataset.timesheetRowHover ?? "") !== (employeeId ?? "")) {
    const prevRow = grid.dataset.timesheetRowHover;
    if (prevRow) {
      grid.querySelectorAll(timesheetRowHighlightSelector(prevRow)).forEach((el) => {
        el.removeAttribute("data-timesheet-row-active");
      });
    }
    if (employeeId) {
      grid.dataset.timesheetRowHover = employeeId;
      grid.querySelectorAll(timesheetRowHighlightSelector(employeeId)).forEach((el) => {
        el.setAttribute("data-timesheet-row-active", "");
      });
    } else {
      delete grid.dataset.timesheetRowHover;
    }
  }
}

function resolveTimesheetCrosshair(target: HTMLElement): TimesheetCrosshairTarget | null {
  const dayCell = target.closest("tbody td[data-timesheet-day]");
  if (dayCell) {
    const dateYmd = dayCell.getAttribute("data-timesheet-day");
    const employeeId =
      dayCell.closest("tr[data-timesheet-employee-row]")?.getAttribute("data-timesheet-employee-row") ?? null;
    if (dateYmd && employeeId) return { dateYmd, employeeId };
  }

  const nameCell = target.closest("td[data-timesheet-sticky-name][data-timesheet-employee-row]");
  if (nameCell) {
    const employeeId = nameCell.getAttribute("data-timesheet-employee-row");
    return employeeId ? { dateYmd: null, employeeId } : null;
  }

  const dayChrome = target.closest("thead th[data-timesheet-day], tfoot td[data-timesheet-day]");
  if (dayChrome) {
    const dateYmd = dayChrome.getAttribute("data-timesheet-day");
    return dateYmd ? { dateYmd, employeeId: null } : null;
  }

  return null;
}

/** Risolve il crosshair dalla posizione del puntatore (non da `event.target`, che può restare indietro). */
function resolvePointerCrosshair(
  grid: HTMLDivElement,
  clientX: number,
  clientY: number,
  fallbackTarget: EventTarget | null,
): TimesheetCrosshairTarget | null {
  const hitEl = document.elementFromPoint(clientX, clientY);
  if (hitEl instanceof HTMLElement && grid.contains(hitEl)) {
    return resolveTimesheetCrosshair(hitEl);
  }
  if (fallbackTarget instanceof HTMLElement && grid.contains(fallbackTarget)) {
    return resolveTimesheetCrosshair(fallbackTarget);
  }
  return null;
}

function dayHeaderClass(isWeekend: boolean): string {
  return [
    timesheetHeaderThBase,
    "min-w-[2.5rem] whitespace-nowrap px-0.5 text-center",
    isWeekend ? "text-[color:var(--cab-text-muted)]" : "",
  ].join(" ");
}

export function DipendentiTimesheetGrid({
  monthKey,
  days: daysProp,
  employees,
  filterEmployeeId,
  getCellValue,
  onCellClick,
  onEmployeeClick,
  tipiAssenza,
  addettiRecords = [],
  readOnly,
  accentDateYmd = null,
}: {
  monthKey: TimesheetMonthKey;
  days?: readonly TimesheetDayInfo[];
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onCellClick: (dipendenteId: string, workDate: string) => void;
  onEmployeeClick: (employee: DipendenteTimesheetEmployeeRow) => void;
  tipiAssenza: readonly TipoAssenzaConfig[];
  addettiRecords?: readonly AddettoRecord[];
  readOnly?: boolean;
  accentDateYmd?: string | null;
}) {
  const days = useMemo(
    () => daysProp ?? buildMonthDays(monthKey),
    [daysProp, monthKey],
  );
  const visibleEmployees = useMemo(
    () => (filterEmployeeId ? employees.filter((e) => e.id === filterEmployeeId) : employees),
    [employees, filterEmployeeId],
  );

  const addettiById = useMemo(
    () => new Map(addettiRecords.map((r) => [r.id, r])),
    [addettiRecords],
  );

  const totalsByEmployee = useMemo(() => {
    const map = new Map<string, TimesheetMonthTotals>();
    for (const emp of visibleEmployees) {
      const dayValues = days.map((d) => getCellValue(emp.id, d.dateYmd));
      let oreOrdinarie = 0;
      let oreStraordinarie = 0;
      let oreAssenza = 0;
      let giorniAssenza = 0;
      for (const cell of dayValues) {
        oreOrdinarie += cell.oreOrdinarie;
        oreStraordinarie += cell.oreStraordinarie;
        oreAssenza += cell.oreAssenza;
        if (cell.oreAssenza > 0) giorniAssenza += 1;
      }
      map.set(emp.id, {
        oreOrdinarie: Math.round(oreOrdinarie * 100) / 100,
        oreStraordinarie: Math.round(oreStraordinarie * 100) / 100,
        oreAssenza: Math.round(oreAssenza * 100) / 100,
        totaleLavorato: Math.round((oreOrdinarie + oreStraordinarie) * 100) / 100,
        giorniAssenza,
      });
    }
    return map;
  }, [visibleEmployees, days, getCellValue]);

  const globalTotals = useMemo(
    () => sumMonthTotalsList([...totalsByEmployee.values()]),
    [totalsByEmployee],
  );

  const dailyTotals = useMemo(
    () =>
      days.map((d) => {
        let oreOrdinarie = 0;
        let oreStraordinarie = 0;
        let oreAssenza = 0;
        for (const emp of visibleEmployees) {
          const cell = getCellValue(emp.id, d.dateYmd);
          oreOrdinarie += cell.oreOrdinarie;
          oreStraordinarie += cell.oreStraordinarie;
          oreAssenza += cell.oreAssenza;
        }
        return {
          totaleLavorato: Math.round((oreOrdinarie + oreStraordinarie) * 100) / 100,
          oreAssenza: Math.round(oreAssenza * 100) / 100,
        };
      }),
    [days, visibleEmployees, getCellValue],
  );

  function formatDayWorkFooter(total: { totaleLavorato: number }): ReactNode {
    return total.totaleLavorato > 0 ? total.totaleLavorato : "—";
  }

  function formatDayAbsenceFooter(total: { oreAssenza: number }): ReactNode {
    return total.oreAssenza > 0 ? total.oreAssenza : "—";
  }

  const isTodayAccentColumn = (dateYmd: string) =>
    accentDateYmd != null && accentDateYmd === dateYmd;

  const dayAccentProps = (dateYmd: string) =>
    isTodayAccentColumn(dateYmd) ? { "data-timesheet-day-accent": "true" as const } : {};

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const applyCrosshair = useCallback((target: TimesheetCrosshairTarget | null) => {
    const grid = scrollContainerRef.current;
    if (target === null) clearTimesheetCrosshair(grid);
    else setTimesheetCrosshair(grid, target);
  }, []);

  const handleGridPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const grid = scrollContainerRef.current;
      if (!grid) return;
      const resolved = resolvePointerCrosshair(
        grid,
        event.clientX,
        event.clientY,
        event.target,
      );
      applyCrosshair(resolved);
    },
    [applyCrosshair],
  );

  const handleGridPointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const related = event.relatedTarget;
    const grid = scrollContainerRef.current;
    if (related instanceof Node && grid?.contains(related)) return;
    clearTimesheetCrosshair(grid);
  }, []);

  useEffect(() => {
    return () => {
      clearTimesheetCrosshair(scrollContainerRef.current);
    };
  }, []);

  useEffect(() => {
    clearTimesheetCrosshair(scrollContainerRef.current);
  }, [monthKey, visibleEmployees.length]);

  useEffect(() => {
    if (!accentDateYmd) return;
    const root = scrollContainerRef.current;
    if (!root) return;
    const cell = root.querySelector(`[data-timesheet-day="${accentDateYmd}"]`);
    if (cell instanceof HTMLElement) {
      cell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [accentDateYmd, monthKey, visibleEmployees.length]);

  const todayRailLayoutKey = `${monthKey}:${visibleEmployees.length}:${filterEmployeeId}`;
  const todayColumnRail = useTimesheetTodayColumnRail(
    scrollContainerRef,
    accentDateYmd,
    todayRailLayoutKey,
  );

  const empBodyRowClass = "border-b border-[color:var(--cab-border)]";

  const stickyNameTd = [
    "sticky left-0 z-[2] border-b border-[color:var(--cab-border)] bg-[var(--cab-card)] align-middle text-left",
    timesheetStickyNamePad,
    timesheetStickyNameCol,
  ].join(" ");
  const stickyNameShadow = timesheetStickyColBodyShadow;
  const dayTd = (weekend: boolean) =>
    [
      "border-b border-[color:var(--cab-border)] p-0 align-middle",
      weekend ? "" : "bg-[var(--cab-card)]",
    ].join(" ");
  const totalTd =
    "border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_25%,var(--cab-card))] px-1 py-1.5 text-center text-xs font-semibold tabular-nums";

  if (visibleEmployees.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[color:var(--cab-text-muted)]">
        Nessun dipendente nel registro. Aggiungi addetti in Configurazione → Lavorazioni.
      </p>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`${timesheetTableScrollClass} hidden md:block`}
      onPointerMove={handleGridPointerMove}
      onPointerLeave={handleGridPointerLeave}
    >
        {todayColumnRail ? (
          <div
            aria-hidden
            className="timesheet-today-column-rail"
            style={{
              left: todayColumnRail.left,
              top: todayColumnRail.top,
              width: todayColumnRail.width,
              height: todayColumnRail.height,
            }}
          />
        ) : null}
        <table className={`${gestionaleListTableClass} min-w-max border-separate border-spacing-0`}>
          <GlobalTableHead sticky>
            <GlobalTableHeadLabel
              label="Dipendente"
              thClassName={`sticky left-0 z-[4] ${timesheetStickyNameCol} bg-[var(--cab-surface-2)] py-2`}
            />
            {days.map((d) => (
              <th
                key={d.dateYmd}
                data-timesheet-day={d.dateYmd}
                data-timesheet-weekend={d.isWeekend ? "true" : undefined}
                {...dayAccentProps(d.dateYmd)}
                className={dayHeaderClass(d.isWeekend)}
                aria-current={isTodayAccentColumn(d.dateYmd) ? "date" : undefined}
              >
                <Tooltip
                  content={formatTimesheetDayColumnTooltip(d, monthKey)}
                  side="bottom"
                  showOnFocus={false}
                  delayMs={220}
                >
                  <span className="block w-full min-w-0 text-center">
                    <span className="gestionale-timesheet-day-accent-day block text-xs font-semibold tabular-nums">
                      {d.day}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal normal-case opacity-80">
                      {d.weekdayShort}
                    </span>
                  </span>
                </Tooltip>
              </th>
            ))}
            <th
              className={`${timesheetHeaderThBase} ${timesheetTotalsColBorder} min-w-[4.5rem] whitespace-nowrap px-1 text-center`}
            >
              <Tooltip
                content="Totali ore del mese (presenze in riga sopra, assenze in riga sotto)"
                side="bottom"
                showOnFocus={false}
                delayMs={220}
              >
                <span className="block w-full min-w-0 text-center">
                  <span className="block normal-case">Tot.</span>
                  <span className="mt-0.5 block text-[10px] font-normal normal-case opacity-80">ore</span>
                </span>
              </Tooltip>
            </th>
          </GlobalTableHead>
          {visibleEmployees.map((emp) => {
            const totals = totalsByEmployee.get(emp.id)!;
            const addetto = emp.source_addetto_id ? addettiById.get(emp.source_addetto_id) : undefined;
            const { nome, cognome } = employeeNameLines(emp, addetto);
            return (
              <tbody key={emp.id}>
                  <tr className={empBodyRowClass} data-timesheet-employee-row={emp.id}>
                    <td
                      data-timesheet-sticky-name=""
                      data-timesheet-employee-row={emp.id}
                      className={`${stickyNameTd} ${stickyNameShadow}`}
                      rowSpan={2}
                    >
                      <Tooltip
                        content={buildTimesheetEmployeeNameTooltip(emp.display_name, {
                          inSettings: emp.in_settings,
                        })}
                        side="right"
                        showOnFocus={false}
                        delayMs={220}
                      >
                        <button
                          type="button"
                          className="w-full break-words rounded-sm text-left transition-colors hover:text-[color:var(--cab-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_40%,transparent)]"
                          onClick={() => onEmployeeClick(emp)}
                        >
                        <span className="block text-xs font-semibold leading-snug text-[color:var(--cab-text)]">
                          {nome}
                        </span>
                        {cognome ? (
                          <span className="mt-0.5 block text-xs font-semibold leading-snug text-[color:var(--cab-text)]">
                            {cognome}
                          </span>
                        ) : null}
                        </button>
                      </Tooltip>
                      {!emp.in_settings ? (
                        <span className="mt-0.5 block text-[9px] leading-snug text-[color:var(--cab-text-muted)]">
                          Storico
                        </span>
                      ) : null}
                    </td>
                    {days.map((d) => (
                      <td
                        key={d.dateYmd}
                        data-timesheet-day={d.dateYmd}
                        {...dayAccentProps(d.dateYmd)}
                        data-timesheet-weekend={d.isWeekend ? "true" : undefined}
                        className={dayTd(d.isWeekend)}
                      >
                        <DipendentiTimesheetCompactCell
                          layer="work"
                          value={getCellValue(emp.id, d.dateYmd)}
                          tipiAssenza={tipiAssenza}
                          isWeekend={d.isWeekend}
                          disabled={readOnly}
                          tooltipLabel={buildTimesheetCellTooltip({
                            employeeName: emp.display_name,
                            day: d,
                            monthKey,
                            layer: "work",
                            value: getCellValue(emp.id, d.dateYmd),
                            tipiAssenza,
                            readOnly,
                          })}
                          onClick={() => onCellClick(emp.id, d.dateYmd)}
                        />
                      </td>
                    ))}
                    <td
                      data-timesheet-employee-row={emp.id}
                      data-timesheet-total=""
                      className={`${timesheetTotalsColBorder} ${totalTd}`}
                    >
                      <Tooltip
                        content={`${emp.display_name} · Totale presenze mese: ${totals.totaleLavorato > 0 ? `${totals.totaleLavorato}h` : "—"}`}
                        side="left"
                        showOnFocus={false}
                        delayMs={220}
                      >
                        <span className="block w-full text-center tabular-nums">
                          {totals.totaleLavorato || "—"}
                        </span>
                      </Tooltip>
                    </td>
                  </tr>
                  <tr className={empBodyRowClass} data-timesheet-employee-row={emp.id}>
                    {days.map((d) => (
                      <td
                        key={d.dateYmd}
                        data-timesheet-day={d.dateYmd}
                        {...dayAccentProps(d.dateYmd)}
                        data-timesheet-weekend={d.isWeekend ? "true" : undefined}
                        className={dayTd(d.isWeekend)}
                      >
                        <DipendentiTimesheetCompactCell
                          layer="absence"
                          value={getCellValue(emp.id, d.dateYmd)}
                          tipiAssenza={tipiAssenza}
                          isWeekend={d.isWeekend}
                          disabled={readOnly}
                          tooltipLabel={buildTimesheetCellTooltip({
                            employeeName: emp.display_name,
                            day: d,
                            monthKey,
                            layer: "absence",
                            value: getCellValue(emp.id, d.dateYmd),
                            tipiAssenza,
                            readOnly,
                          })}
                          onClick={() => onCellClick(emp.id, d.dateYmd)}
                        />
                      </td>
                    ))}
                    <td
                      data-timesheet-employee-row={emp.id}
                      data-timesheet-total=""
                      className={`${timesheetTotalsColBorder} ${totalTd} text-[color:var(--cab-text-muted)]`}
                    >
                      <Tooltip
                        content={`${emp.display_name} · Totale assenze mese: ${totals.oreAssenza > 0 ? `${totals.oreAssenza}h` : "—"}`}
                        side="left"
                        showOnFocus={false}
                        delayMs={220}
                      >
                        <span className="block w-full text-center tabular-nums">
                          {totals.oreAssenza || "—"}
                        </span>
                      </Tooltip>
                    </td>
                  </tr>
              </tbody>
            );
          })}
          <tfoot className="bg-[var(--cab-surface-2)]">
            <tr>
              <td
                className={`${timesheetFooterTdBase} sticky left-0 z-[2] ${timesheetStickyNameCol} ${timesheetStickyNamePad} text-left text-[color:var(--cab-text-muted)]`}
                rowSpan={2}
              >
                <span className={`${globalTableThLabel} block truncate whitespace-nowrap`}>Totali mese</span>
              </td>
              {days.map((d, index) => {
                const dayTotal = dailyTotals[index]!;
                return (
                  <td
                    key={d.dateYmd}
                    data-timesheet-day={d.dateYmd}
                    data-timesheet-weekend={d.isWeekend ? "true" : undefined}
                    {...dayAccentProps(d.dateYmd)}
                    className={[
                      timesheetFooterTdBase,
                      "px-0.5 text-center text-xs font-semibold tabular-nums",
                    ].join(" ")}
                  >
                    <Tooltip
                      content={formatTimesheetFooterDayTooltip(
                        d,
                        monthKey,
                        "work",
                        dayTotal.totaleLavorato,
                      )}
                      side="top"
                      showOnFocus={false}
                      delayMs={220}
                    >
                      <span className="block w-full text-center tabular-nums">
                        {formatDayWorkFooter(dayTotal)}
                      </span>
                    </Tooltip>
                  </td>
                );
              })}
              <td
                className={`${timesheetFooterTdBase} ${timesheetTotalsColBorder} px-1 text-center text-xs font-semibold tabular-nums`}
              >
                <Tooltip
                  content={formatTimesheetFooterMonthTooltip(monthKey, "work", globalTotals.totaleLavorato)}
                  side="left"
                  showOnFocus={false}
                  delayMs={220}
                >
                  <span className="block w-full text-center tabular-nums">
                    {globalTotals.totaleLavorato || "—"}
                  </span>
                </Tooltip>
              </td>
            </tr>
            <tr>
              {days.map((d, index) => {
                const dayTotal = dailyTotals[index]!;
                return (
                  <td
                    key={d.dateYmd}
                    data-timesheet-day={d.dateYmd}
                    data-timesheet-weekend={d.isWeekend ? "true" : undefined}
                    {...dayAccentProps(d.dateYmd)}
                    className={[
                      timesheetFooterTdBase,
                      "px-0.5 text-center text-xs font-semibold tabular-nums text-[color:var(--cab-text-muted)]",
                    ].join(" ")}
                  >
                    <Tooltip
                      content={formatTimesheetFooterDayTooltip(
                        d,
                        monthKey,
                        "absence",
                        dayTotal.oreAssenza,
                      )}
                      side="top"
                      showOnFocus={false}
                      delayMs={220}
                    >
                      <span className="block w-full text-center tabular-nums">
                        {formatDayAbsenceFooter(dayTotal)}
                      </span>
                    </Tooltip>
                  </td>
                );
              })}
              <td
                className={`${timesheetFooterTdBase} ${timesheetTotalsColBorder} px-1 text-center text-xs font-semibold tabular-nums text-[color:var(--cab-text-muted)]`}
              >
                <Tooltip
                  content={formatTimesheetFooterMonthTooltip(monthKey, "absence", globalTotals.oreAssenza)}
                  side="left"
                  showOnFocus={false}
                  delayMs={220}
                >
                  <span className="block w-full text-center tabular-nums">
                    {globalTotals.oreAssenza || "—"}
                  </span>
                </Tooltip>
              </td>
            </tr>
          </tfoot>
        </table>
    </div>
  );
}
