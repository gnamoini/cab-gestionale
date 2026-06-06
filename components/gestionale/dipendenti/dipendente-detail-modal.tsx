"use client";

import { useMemo } from "react";
import { buildMonthDays, formatMonthLabel } from "@/lib/dipendenti/timesheet-month";
import { computeMonthTotals, entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import { GlobalTableHead } from "@/components/gestionale/global-table";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export function DipendenteDetailModal({
  open,
  onClose,
  employee,
  monthKey,
  entries,
  tipiAssenza: _tipiAssenza,
}: {
  open: boolean;
  onClose: () => void;
  employee: DipendenteTimesheetEmployeeRow | null;
  monthKey: TimesheetMonthKey;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
}) {
  const days = useMemo(() => buildMonthDays(monthKey), [monthKey]);
  const empEntries = useMemo(
    () => (employee ? entries.filter((e) => e.dipendente_id === employee.id) : []),
    [employee, entries],
  );
  const totals = useMemo(() => computeMonthTotals(empEntries), [empEntries]);

  if (!open || !employee) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title={employee.display_name}
      subtitle={formatMonthLabel(monthKey)}
    >
      <GestionaleModalScrollBody className="py-3">
        <div className="mb-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2">
            <p className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Ordinarie</p>
            <p className="text-lg font-semibold tabular-nums">{totals.oreOrdinarie} h</p>
          </div>
          <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2">
            <p className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Straordinarie</p>
            <p className="text-lg font-semibold tabular-nums">{totals.oreStraordinarie} h</p>
          </div>
          <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2">
            <p className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Assenze</p>
            <p className="text-lg font-semibold tabular-nums">{totals.oreAssenza} h</p>
          </div>
          <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2">
            <p className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Lavorato</p>
            <p className="text-lg font-semibold tabular-nums">{totals.totaleLavorato} h</p>
          </div>
        </div>
        <table className="w-full text-xs">
          <GlobalTableHead>
            <tr className="border-b border-[color:var(--cab-border)] text-left text-[color:var(--cab-text-muted)]">
              <th className="py-1.5 pr-2">Giorno</th>
              <th className="py-1.5 px-1 text-center">Ord.</th>
              <th className="py-1.5 px-1 text-center">Str.</th>
              <th className="py-1.5 px-1 text-center">Ass.</th>
              <th className="py-1.5 pl-2">Tipo / Note</th>
            </tr>
          </GlobalTableHead>
          <tbody>
            {days.map((d) => {
              const cell = entryToCellValue(empEntries.find((e) => e.work_date === d.dateYmd));
              const hasData = cell.oreOrdinarie > 0 || cell.oreStraordinarie > 0 || cell.oreAssenza > 0;
              return (
                <tr key={d.dateYmd} className="border-b border-[color:color-mix(in_srgb,var(--cab-border)_60%,transparent)]">
                  <td className={gestionaleListTableTd}>
                    {String(d.day).padStart(2, "0")} {d.weekdayShort}
                  </td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreOrdinarie || "—"}</td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreStraordinarie || "—"}</td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreAssenza || "—"}</td>
                  <td className={gestionaleListTableTd}>
                    {hasData
                      ? [cell.tipoAssenzaLabel, cell.motivoCustom, cell.note].filter(Boolean).join(" · ") || "—"
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GestionaleModalScrollBody>
      <div className="flex shrink-0 min-w-0 justify-end gap-2 border-t border-[color:var(--cab-border)] px-4 py-3 sm:px-5">
        <button type="button" className={erpBtnNeutral} onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className={erpBtnAccent} onClick={onClose}>
          OK
        </button>
      </div>
    </GestionaleModalShell>
  );
}
