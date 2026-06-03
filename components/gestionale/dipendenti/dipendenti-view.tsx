"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { DipendentiPdfToolbar } from "@/components/gestionale/dipendenti/dipendenti-pdf-toolbar";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  defaultDayDate,
  defaultWeekAnchor,
  TimesheetHeader,
} from "@/components/gestionale/dipendenti/timesheet-header";
import { TimesheetEditorModal } from "@/components/gestionale/dipendenti/timesheet-editor-modal";
import { DipendenteDetailModal } from "@/components/gestionale/dipendenti/dipendente-detail-modal";
import { TimesheetEmptyState } from "@/components/gestionale/dipendenti/timesheet-empty-state";
import { TimesheetLoadError } from "@/components/gestionale/dipendenti/timesheet-load-error";
import { TimesheetTableView } from "@/components/gestionale/dipendenti/timesheet-table-view";
import { LoadingDipendentiSkeleton } from "@/components/design-system";
import {
  buildDipendentiPdfContext,
  openDipendentiPdfComplessivoInNewTab,
  openDipendentiPdfDipendenteInNewTab,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-export";
import {
  currentMonthKey,
  isDateInMonthKey,
  monthKeyFromDate,
  todayDateYmd,
} from "@/lib/dipendenti/timesheet-month";
import type { TimesheetEditorTarget, TimesheetEntryUpsert, TimesheetMonthKey, DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import type { TimesheetPeriodMode } from "@/lib/dipendenti/timesheet-month";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useDipendentiTimesheet } from "@/src/hooks/use-dipendenti-timesheet";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

/** Evidenziazione colonna «Oggi» — durata lettura dopo animazione CSS (~760ms). */
const TIMESHEET_TODAY_ACCENT_MS = 2800;

export function DipendentiView() {
  const [monthKey, setMonthKey] = useState<TimesheetMonthKey>(() => monthKeyFromDate(new Date()));
  const [periodMode] = useState<TimesheetPeriodMode>("month");
  const [weekAnchor, setWeekAnchor] = useState(() => defaultWeekAnchor(monthKeyFromDate(new Date())));
  const [dayDate, setDayDate] = useState(() => defaultDayDate(monthKeyFromDate(new Date())));
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [editorTarget, setEditorTarget] = useState<TimesheetEditorTarget | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<DipendenteTimesheetEmployeeRow | null>(null);
  const [bootstrapPending, setBootstrapPending] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [accentDateYmd, setAccentDateYmd] = useState<string | null>(null);
  const accentClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (accentClearTimerRef.current) clearTimeout(accentClearTimerRef.current);
    };
  }, []);

  const perm = usePermissions("dipendenti");
  const { validation: toastValidation } = useGestionaleToast();
  const ts = useDipendentiTimesheet({ monthKey, periodMode, weekAnchor, dayDate });

  useEffect(() => {
    if (!filterEmployeeId) return;
    if (!ts.displayEmployees.some((e) => e.id === filterEmployeeId)) {
      setFilterEmployeeId("");
    }
  }, [filterEmployeeId, ts.displayEmployees]);

  const readOnly = !perm.canWrite;

  const editorEmployee =
    editorTarget != null
      ? (ts.displayEmployees.find((e) => e.id === editorTarget.dipendenteId) ?? null)
      : null;

  const editorDateLabel = (() => {
    if (!editorTarget) return "";
    const day = ts.periodDays.find((d) => d.dateYmd === editorTarget.workDate);
    if (!day) return editorTarget.workDate;
    return `${String(day.day).padStart(2, "0")}/${monthKey.split("-")[1]}/${monthKey.split("-")[0]} (${day.weekdayShort})`;
  })();

  const handleSaveEntry = useCallback(
    async (input: TimesheetEntryUpsert) => {
      if (readOnly) return;
      await ts.saveNow(input);
    },
    [readOnly, ts],
  );

  const handleScheduleSave = useCallback(
    (input: TimesheetEntryUpsert) => {
      if (readOnly) return;
      ts.scheduleSave(input);
    },
    [readOnly, ts],
  );

  const handleCellClick = useCallback((dipendenteId: string, workDate: string) => {
    setDetailEmployee(null);
    setEditorTarget({ dipendenteId, workDate });
  }, []);

  const pdfContext = useCallback(
    () =>
      buildDipendentiPdfContext({
        monthKey,
        employees: ts.displayEmployees,
        entries: ts.entries,
        tipiAssenza: ts.tipiAssenza,
      }),
    [monthKey, ts.displayEmployees, ts.entries, ts.tipiAssenza],
  );

  const handleExportPdfComplessivo = useCallback(() => {
    if (pdfExporting || ts.displayEmployees.length === 0) return;
    setPdfExporting(true);
    try {
      openDipendentiPdfComplessivoInNewTab(pdfContext());
    } finally {
      setPdfExporting(false);
    }
  }, [pdfExporting, pdfContext, ts.displayEmployees.length]);

  const handleExportPdfDipendente = useCallback(() => {
    if (pdfExporting) return;
    if (!filterEmployeeId) {
      toastValidation(GESTIONALE_TOAST.dipendentiSelectAddettoForPdf);
      return;
    }
    const employee = ts.displayEmployees.find((e) => e.id === filterEmployeeId);
    if (!employee) {
      toastValidation(GESTIONALE_TOAST.dipendentiSelectAddettoForPdf);
      return;
    }
    setPdfExporting(true);
    try {
      openDipendentiPdfDipendenteInNewTab(pdfContext(), employee);
    } finally {
      setPdfExporting(false);
    }
  }, [pdfExporting, pdfContext, ts.displayEmployees, filterEmployeeId, toastValidation]);

  const handleBootstrap = useCallback(async () => {
    setBootstrapPending(true);
    try {
      await ts.bootstrapEmployees();
      ts.refetchEmployees();
    } finally {
      setBootstrapPending(false);
    }
  }, [ts]);

  const handleMonthKey = useCallback((key: TimesheetMonthKey) => {
    setMonthKey(key);
    setWeekAnchor(defaultWeekAnchor(key));
    setDayDate(defaultDayDate(key));
    setAccentDateYmd((prev) => (prev && !isDateInMonthKey(prev, key) ? null : prev));
    setEditorTarget(null);
    setDetailEmployee(null);
  }, []);

  const handleGoToToday = useCallback(() => {
    if (accentClearTimerRef.current) clearTimeout(accentClearTimerRef.current);
    handleMonthKey(currentMonthKey());
    setAccentDateYmd(todayDateYmd());
    accentClearTimerRef.current = setTimeout(() => {
      setAccentDateYmd(null);
      accentClearTimerRef.current = null;
    }, TIMESHEET_TODAY_ACCENT_MS);
  }, [handleMonthKey]);

  if (perm.isLoading) {
    return <LoadingDipendentiSkeleton />;
  }

  const showRegistryEmpty =
    ts.loadPhase !== "error" && ts.hasRealAddetti && ts.displayEmployees.length === 0 && !ts.isSyncing;
  const showNoAddetti = ts.loadPhase !== "error" && ts.addettiReady && !ts.hasRealAddetti;
  const settingsLoading = ts.addettiSource !== "app_settings" && !ts.addettiReady;

  return (
    <GestionaleSectionGate module="dipendenti">
      <div className={layoutPageRoot}>
        <PageHeader
          title="Dipendenti"
          actions={
            <DipendentiPdfToolbar
              filterEmployeeId={filterEmployeeId}
              exporting={pdfExporting}
              onExportComplessivo={handleExportPdfComplessivo}
              onExportDipendente={handleExportPdfDipendente}
            />
          }
        />
        <div className={`${dsStackPage} flex-safe-col min-w-0 max-w-full`}>
          <TimesheetHeader
            periodMode={periodMode}
            monthKey={monthKey}
            onMonthKey={handleMonthKey}
            weekAnchor={weekAnchor}
            onWeekAnchor={setWeekAnchor}
            dayDate={dayDate}
            onDayDate={setDayDate}
            employees={ts.displayEmployees}
            filterEmployeeId={filterEmployeeId}
            onFilterEmployeeId={setFilterEmployeeId}
            saveStatus={ts.saveStatus}
            showBackgroundSync={ts.showBackgroundSyncInToolbar}
            onGoToToday={handleGoToToday}
          />

          <TimesheetLoadError
            loadPhase={ts.loadPhase}
            errorKind={ts.errorKind}
            employeesError={ts.employeesError}
            entriesError={ts.entriesError}
            syncError={ts.syncError}
            onRetryEmployees={ts.refetchEmployees}
            onRetryEntries={ts.refetchEntries}
          />

          {settingsLoading || ts.isInitialLoading ? (
            <LoadingDipendentiSkeleton embedded />
          ) : showNoAddetti ? (
            <TimesheetEmptyState variant="no-addetti" />
          ) : showRegistryEmpty ? (
            <TimesheetEmptyState
              variant="no-employees"
              onBootstrap={() => void handleBootstrap()}
              bootstrapPending={bootstrapPending || ts.isSyncing}
              bootstrapError={ts.syncError}
              readOnly={readOnly}
            />
          ) : ts.loadPhase === "ready" ? (
            <ShellCard title="Tabella presenze">
              {ts.entriesDegraded ? (
                <div
                  className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                  role="status"
                >
                  Presenze non aggiornate: visualizzazione in sola lettura con dati in cache.
                  <button
                    type="button"
                    className="ml-2 font-semibold underline"
                    onClick={() => void ts.refetchEntries()}
                  >
                    Riprova
                  </button>
                </div>
              ) : null}
              <TimesheetTableView
                monthKey={monthKey}
                periodDays={ts.periodDays}
                employees={ts.displayEmployees}
                filterEmployeeId={filterEmployeeId}
                getCellValue={ts.getCellValue}
                onCellClick={handleCellClick}
                onEmployeeClick={(emp) => {
                  setEditorTarget(null);
                  setDetailEmployee(emp);
                }}
                entries={ts.entries}
                tipiAssenza={ts.tipiAssenza}
                addettiRecords={ts.addettiRecords}
                readOnly={readOnly || ts.entriesDegraded}
                accentDateYmd={accentDateYmd}
              />
            </ShellCard>
          ) : null}
        </div>

        {editorTarget && editorEmployee ? (
          <TimesheetEditorModal
            key={`${editorTarget.dipendenteId}|${editorTarget.workDate}`}
            open
            onClose={() => setEditorTarget(null)}
            anchorLabel={`${editorEmployee.display_name} · ${editorDateLabel}`}
            dipendenteId={editorTarget.dipendenteId}
            workDate={editorTarget.workDate}
            initialValue={ts.getCellValue(editorTarget.dipendenteId, editorTarget.workDate)}
            tipiAssenza={ts.tipiAssenza}
            readOnly={readOnly}
            onSave={handleSaveEntry}
            onScheduleSave={handleScheduleSave}
            saving={ts.upsertPending}
          />
        ) : null}

        <DipendenteDetailModal
          open={detailEmployee != null}
          onClose={() => setDetailEmployee(null)}
          employee={detailEmployee}
          monthKey={monthKey}
          entries={ts.entries}
          tipiAssenza={ts.tipiAssenza}
        />
      </div>
    </GestionaleSectionGate>
  );
}
