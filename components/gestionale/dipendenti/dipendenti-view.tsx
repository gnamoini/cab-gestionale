"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import type { PageActionItem } from "@/components/ui";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  defaultDayDate,
  TimesheetHeader,
} from "@/components/gestionale/dipendenti/timesheet-header";
import { TimesheetEmptyState } from "@/components/gestionale/dipendenti/timesheet-empty-state";
import { TimesheetLoadError } from "@/components/gestionale/dipendenti/timesheet-load-error";
import { TimesheetTableView } from "@/components/gestionale/dipendenti/timesheet-table-view";
import { DipendentiTimesheetSection } from "@/components/gestionale/dipendenti/dipendenti-page-structure";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  buildDipendentiPdfContext,
  openDipendentiPdfComplessivoInNewTab,
  openDipendentiPdfDipendenteInNewTab,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-export";
import { prefetchDipendentiMonthEntries } from "@/lib/dipendenti/prefetch-dipendenti-month-entries";
import { buildEmptyDay8hUpserts, buildEmptyDayFerieUpserts, resolveFerieTipoAssenza } from "@/lib/dipendenti/timesheet-bulk-fill-day";
import {
  currentMonthKey,
  isDateInMonthKey,
  monthKeyFromDate,
  monthKeyFromParts,
  parseMonthKey,
  resolveWeekAnchorForMonth,
  shiftMonthKey,
  todayDateYmd,
} from "@/lib/dipendenti/timesheet-month";
import type { TimesheetEditorTarget, TimesheetEntryUpsert, TimesheetMonthKey, DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import type { TimesheetPeriodMode } from "@/lib/dipendenti/timesheet-month";
import { dsFocus, dsStackPage } from "@/lib/ui/design-system";
import { globalInputCalendarNavBtn } from "@/lib/ui/global-input";
import { CalendarMonthYearPicker } from "@/components/gestionale/global-input/calendar-month-year-picker";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import { gestionaleListTierClass } from "@/lib/ui/gestionale-list-responsive";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useDipendentiTimesheet } from "@/src/hooks/use-dipendenti-timesheet";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

/** Evidenziazione colonna «Oggi» — hold + fade-out (allineato a CSS --timesheet-today-*). */
const TIMESHEET_TODAY_ACCENT_HOLD_MS = 900;
const TIMESHEET_TODAY_ACCENT_FADE_MS = 360;

const TimesheetEditorModal = dynamic(
  () =>
    import("@/components/gestionale/dipendenti/timesheet-editor-modal").then((m) => ({
      default: m.TimesheetEditorModal,
    })),
  { ssr: false },
);

const DipendenteDetailModal = dynamic(
  () =>
    import("@/components/gestionale/dipendenti/dipendente-detail-modal").then((m) => ({
      default: m.DipendenteDetailModal,
    })),
  { ssr: false },
);

const DipendentiOperationalPanel = dynamic(
  () =>
    import("@/components/operational-analytics/dipendenti-operational-panel").then((m) => ({
      default: m.DipendentiOperationalPanel,
    })),
  { ssr: false },
);

function formatWorkDateIt(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-");
  return `${d}/${m}/${y}`;
}

export function DipendentiView({ listSurface: serverListSurface, listTier = "md" }: GestionaleListPageProps) {
  useGestionaleSyncScope({
    scopeId: "dipendenti-view",
    domain: "dipendenti",
    route: "/dipendenti",
    tables: ["dipendenti_timesheet_employees", "dipendenti_timesheet_entries"],
  });
  const listSurface = useListSurface(serverListSurface);
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState<TimesheetMonthKey>(() => monthKeyFromDate(new Date()));
  const [periodMode] = useState<TimesheetPeriodMode>("month");
  const [weekAnchor, setWeekAnchor] = useState(() =>
    resolveWeekAnchorForMonth(monthKeyFromDate(new Date())),
  );
  const [dayDate, setDayDate] = useState(() => defaultDayDate(monthKeyFromDate(new Date())));
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [editorTarget, setEditorTarget] = useState<TimesheetEditorTarget | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<DipendenteTimesheetEmployeeRow | null>(null);
  const [bootstrapPending, setBootstrapPending] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [accentDateYmd, setAccentDateYmd] = useState<string | null>(null);
  const [accentFadingOut, setAccentFadingOut] = useState(false);
  const [fillTodayBulkPending, setFillTodayBulkPending] = useState(false);
  const [fillTodayConfirmOpen, setFillTodayConfirmOpen] = useState(false);
  const [fillTodayConfirmKind, setFillTodayConfirmKind] = useState<"ordinarie" | "ferie">("ordinarie");
  const [fillTodayUpserts, setFillTodayUpserts] = useState<TimesheetEntryUpsert[]>([]);
  const accentClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (accentClearTimerRef.current) clearTimeout(accentClearTimerRef.current);
    };
  }, []);

  const perm = usePermissions("dipendenti");
  const { validation: toastValidation, successOnce, errorOnce } = useGestionaleToast();
  const ts = useDipendentiTimesheet({ monthKey, periodMode, weekAnchor, dayDate });

  useEffect(() => {
    void prefetchDipendentiMonthEntries(queryClient, shiftMonthKey(monthKey, -1));
    void prefetchDipendentiMonthEntries(queryClient, shiftMonthKey(monthKey, 1));
  }, [monthKey, queryClient]);

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

  const handleCopyDayToAll = useCallback(
    async (upserts: TimesheetEntryUpsert[]) => {
      if (readOnly || upserts.length === 0) return;
      await Promise.all(upserts.map((input) => ts.saveNow(input)));
      successOnce("dip-copy-day-all", GESTIONALE_TOAST.dipendentiCopyDayToAllSuccess);
    },
    [readOnly, ts, successOnce],
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
        addettiRecords: ts.dipendentiRecords,
      }),
    [monthKey, ts.displayEmployees, ts.entries, ts.tipiAssenza, ts.dipendentiRecords],
  );

  const handleExportPdfComplessivo = useCallback(() => {
    if (pdfExporting || ts.displayEmployees.length === 0) return;
    void (async () => {
      setPdfExporting(true);
      try {
        await openDipendentiPdfComplessivoInNewTab(pdfContext());
      } finally {
        setPdfExporting(false);
      }
    })();
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
    void (async () => {
      setPdfExporting(true);
      try {
        await openDipendentiPdfDipendenteInNewTab(pdfContext(), employee);
      } finally {
        setPdfExporting(false);
      }
    })();
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
    setWeekAnchor(resolveWeekAnchorForMonth(key));
    setDayDate(defaultDayDate(key));
    setAccentDateYmd((prev) => (prev && !isDateInMonthKey(prev, key) ? null : prev));
    setAccentFadingOut(false);
    setEditorTarget(null);
    setDetailEmployee(null);
  }, []);

  const handleGoToToday = useCallback(() => {
    if (accentClearTimerRef.current) clearTimeout(accentClearTimerRef.current);
    const today = todayDateYmd();
    handleMonthKey(currentMonthKey());
    setWeekAnchor(today);
    setAccentFadingOut(false);
    setAccentDateYmd(today);
    accentClearTimerRef.current = setTimeout(() => {
      setAccentFadingOut(true);
      accentClearTimerRef.current = setTimeout(() => {
        setAccentDateYmd(null);
        setAccentFadingOut(false);
        accentClearTimerRef.current = null;
      }, TIMESHEET_TODAY_ACCENT_FADE_MS);
    }, TIMESHEET_TODAY_ACCENT_HOLD_MS);
  }, [handleMonthKey]);

  const todayYmd = todayDateYmd();
  const todayInViewedMonth = isDateInMonthKey(todayYmd, monthKey);
  const { year: viewYear, month: viewMonth } = parseMonthKey(monthKey);

  const ferieTipo = useMemo(() => resolveFerieTipoAssenza(ts.tipiAssenza), [ts.tipiAssenza]);

  const fillTodayBulkDisabled =
    readOnly ||
    ts.entriesDegraded ||
    ts.loadPhase !== "ready" ||
    ts.displayEmployees.length === 0 ||
    !todayInViewedMonth ||
    fillTodayBulkPending ||
    ts.upsertPending;

  const fillTodayFerieDisabled = !ferieTipo;

  const handleFillToday8h = useCallback(() => {
    if (readOnly || ts.entriesDegraded || fillTodayBulkPending || ts.upsertPending) return;
    const workDate = todayDateYmd();
    if (!isDateInMonthKey(workDate, monthKey)) {
      toastValidation(GESTIONALE_TOAST.dipendentiFillToday8hNotInMonth);
      return;
    }
    const upserts = buildEmptyDay8hUpserts(ts.displayEmployees, workDate, ts.getCellValue);
    if (upserts.length === 0) {
      toastValidation(GESTIONALE_TOAST.dipendentiFillToday8hNoEmpty);
      return;
    }
    setFillTodayConfirmKind("ordinarie");
    setFillTodayUpserts(upserts);
    setFillTodayConfirmOpen(true);
  }, [
    readOnly,
    ts.entriesDegraded,
    ts.upsertPending,
    ts.displayEmployees,
    ts.getCellValue,
    monthKey,
    fillTodayBulkPending,
    toastValidation,
  ]);

  const handleFillTodayFerie = useCallback(() => {
    if (readOnly || ts.entriesDegraded || fillTodayBulkPending || ts.upsertPending || !ferieTipo) return;
    const workDate = todayDateYmd();
    if (!isDateInMonthKey(workDate, monthKey)) {
      toastValidation(GESTIONALE_TOAST.dipendentiFillToday8hNotInMonth);
      return;
    }
    const upserts = buildEmptyDayFerieUpserts(
      ts.displayEmployees,
      workDate,
      ts.getCellValue,
      ferieTipo,
    );
    if (upserts.length === 0) {
      toastValidation(GESTIONALE_TOAST.dipendentiFillTodayFerieNoEmpty);
      return;
    }
    setFillTodayConfirmKind("ferie");
    setFillTodayUpserts(upserts);
    setFillTodayConfirmOpen(true);
  }, [
    readOnly,
    ts.entriesDegraded,
    ts.upsertPending,
    ts.displayEmployees,
    ts.getCellValue,
    monthKey,
    fillTodayBulkPending,
    ferieTipo,
    toastValidation,
  ]);

  const handleConfirmFillToday = useCallback(async () => {
    if (fillTodayUpserts.length === 0) {
      setFillTodayConfirmOpen(false);
      return;
    }
    setFillTodayBulkPending(true);
    try {
      await Promise.all(fillTodayUpserts.map((input) => ts.saveNow(input)));
      successOnce(
        fillTodayConfirmKind === "ferie" ? "dip-fill-today-ferie" : "dip-fill-today-8h",
        fillTodayConfirmKind === "ferie"
          ? GESTIONALE_TOAST.dipendentiFillTodayFerieSuccess
          : GESTIONALE_TOAST.dipendentiFillToday8hSuccess,
      );
      setFillTodayConfirmOpen(false);
      setFillTodayUpserts([]);
    } catch (e) {
      errorOnce(
        fillTodayConfirmKind === "ferie" ? "dip-fill-today-ferie" : "dip-fill-today-8h",
        e,
        { module: "dipendenti", action: "update" },
      );
    } finally {
      setFillTodayBulkPending(false);
    }
  }, [fillTodayUpserts, fillTodayConfirmKind, ts, successOnce, errorOnce]);

  const showRegistryEmpty =
    ts.loadPhase !== "error" && ts.hasRealDipendenti && ts.displayEmployees.length === 0 && !ts.isSyncing;
  const showNoAddetti = ts.loadPhase !== "error" && ts.dipendentiReady && !ts.hasRealDipendenti;
  const settingsLoading = ts.dipendentiSource !== "app_settings" && !ts.dipendentiReady;

  const dipendentiMenuItems = useMemo((): PageActionItem[] => [
    {
      id: "pdf-complessivo",
      label: "PDF complessivo",
      description: "Esporta presenze di tutti i dipendenti",
      onSelect: handleExportPdfComplessivo,
      loading: pdfExporting,
    },
    {
      id: "pdf-dipendente",
      label: "PDF dipendente",
      description: filterEmployeeId ? "Esporta presenze del dipendente selezionato" : "Seleziona un dipendente",
      onSelect: handleExportPdfDipendente,
      disabled: !filterEmployeeId,
      loading: pdfExporting,
    },
  ], [filterEmployeeId, pdfExporting, handleExportPdfComplessivo, handleExportPdfDipendente]);

  return (
    <GestionaleSectionGate module="dipendenti">
      <div className={`${layoutPageRoot} ${gestionaleListTierClass(listTier)}`.trim()}>
        <PageHeaderPageActionMenu items={dipendentiMenuItems} />
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
            onFillToday8h={readOnly ? undefined : handleFillToday8h}
            onFillTodayFerie={readOnly ? undefined : handleFillTodayFerie}
            fillTodayBulkPending={fillTodayBulkPending}
            fillTodayBulkDisabled={fillTodayBulkDisabled}
            fillTodayFerieDisabled={fillTodayFerieDisabled}
            monthKeysWithData={ts.monthKeysWithData}
          />

          {ts.loadPhase === "ready" ? <DipendentiOperationalPanel monthKey={monthKey} /> : null}

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
            <DipendentiTimesheetSection mode="skeleton" />
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
            <ShellCard
              title="Tabella presenze"
              headerLeadingActions={
                <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Navigazione mese">
                  <button
                    type="button"
                    className={`${globalInputCalendarNavBtn} ${dsFocus}`}
                    aria-label="Mese precedente"
                    onClick={() => handleMonthKey(shiftMonthKey(monthKey, -1))}
                  >
                    <CalendarNavChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex min-w-0 items-center justify-center">
                    <CalendarMonthYearPicker
                      viewYear={viewYear}
                      viewMonth={viewMonth - 1}
                      variant="grid"
                      onApply={(year, monthIndex) =>
                        handleMonthKey(monthKeyFromParts(year, monthIndex + 1))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className={`${globalInputCalendarNavBtn} ${dsFocus}`}
                    aria-label="Mese successivo"
                    onClick={() => handleMonthKey(shiftMonthKey(monthKey, 1))}
                  >
                    <CalendarNavChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            >
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
                listSurface={listSurface}
                monthKey={monthKey}
                periodDays={ts.periodDays}
                weekAnchor={weekAnchor}
                onWeekAnchor={setWeekAnchor}
                employees={ts.displayEmployees}
                filterEmployeeId={filterEmployeeId}
                getCellValue={ts.getCellValue}
                onCellClick={handleCellClick}
                onEmployeeClick={(emp) => {
                  setEditorTarget(null);
                  setDetailEmployee(emp);
                }}
                tipiAssenza={ts.tipiAssenza}
                dipendentiRecords={ts.dipendentiRecords}
                readOnly={readOnly || ts.entriesDegraded}
                accentDateYmd={accentDateYmd}
                accentFadingOut={accentFadingOut}
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
            employees={ts.displayEmployees}
            onSave={handleSaveEntry}
            onCopyToAll={readOnly || ts.entriesDegraded ? undefined : handleCopyDayToAll}
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

        <GestionaleConfirmDialog
          open={fillTodayConfirmOpen}
          title={fillTodayConfirmKind === "ferie" ? "Imposta 8 ore ferie per oggi" : "Imposta 8 ore per oggi"}
          message={
            fillTodayUpserts.length > 0
              ? fillTodayConfirmKind === "ferie"
                ? `Compilare 8 ore di ferie per ${fillTodayUpserts.length} addett${
                    fillTodayUpserts.length === 1 ? "o" : "i"
                  } con cella vuota il ${formatWorkDateIt(todayYmd)}? Le celle già compilate non verranno modificate.`
                : `Compilare 8 ore ordinarie per ${fillTodayUpserts.length} addett${
                    fillTodayUpserts.length === 1 ? "o" : "i"
                  } con cella vuota il ${formatWorkDateIt(todayYmd)}? Le celle già compilate non verranno modificate.`
              : undefined
          }
          confirmLabel={fillTodayBulkPending ? "Salvataggio…" : "Conferma"}
          pending={fillTodayBulkPending}
          onCancel={() => {
            if (fillTodayBulkPending) return;
            setFillTodayConfirmOpen(false);
            setFillTodayUpserts([]);
          }}
          onConfirm={() => void handleConfirmFillToday()}
        />
      </div>
    </GestionaleSectionGate>
  );
}
