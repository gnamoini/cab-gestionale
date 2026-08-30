"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDipendentiTimesheetDerived } from "@/lib/dipendenti/use-dipendenti-timesheet-derived";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetEntryUpsert,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import {
  monthKeyFromDate,
  buildPeriodDays,
  resolvePeriodRange,
  shiftMonthKey,
  type TimesheetPeriodMode,
} from "@/lib/dipendenti/timesheet-month";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import type { DipendenteRecord } from "@/lib/dipendenti/dipendente-record";
import { getActiveDipendentiRecords } from "@/lib/dipendenti/dipendente-record";
import { useDipendentiRecords, useTipiAssenza } from "@/src/hooks/use-global-options";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { usePwaUpdateGuard } from "@/lib/pwa/pwa-update-guard";
import { QK } from "@/src/lib/react-query/query-keys";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";
import {
  dispatchTimesheetEmployeesChanged,
  dispatchTimesheetEntryChanged,
} from "@/lib/dipendenti/dipendenti-timesheet-sync-dispatch";
import {
  dipendentiEntriesQueryKey,
  useDipendentiEmployeesQuery,
  useDipendentiEntriesRangeQuery,
  useDipendentiMonthKeysQuery,
} from "@/src/hooks/gestionale/use-dipendenti-timesheet-queries";

const DEBOUNCE_MS = 400;

export type TimesheetLoadPhase = "settings" | "registry" | "entries" | "ready" | "error";
export type TimesheetErrorKind = "rbac" | "network" | "sync" | "unknown";

export type UseDipendentiTimesheetOptions = {
  monthKey: TimesheetMonthKey;
  periodMode?: TimesheetPeriodMode;
  weekAnchor?: string;
  dayDate?: string;
};

function normalizeOptions(
  monthKeyOrOptions: TimesheetMonthKey | UseDipendentiTimesheetOptions,
): Required<UseDipendentiTimesheetOptions> {
  if (typeof monthKeyOrOptions === "string") {
    return { monthKey: monthKeyOrOptions, periodMode: "month", weekAnchor: "", dayDate: "" };
  }
  return {
    monthKey: monthKeyOrOptions.monthKey,
    periodMode: monthKeyOrOptions.periodMode ?? "month",
    weekAnchor: monthKeyOrOptions.weekAnchor ?? "",
    dayDate: monthKeyOrOptions.dayDate ?? "",
  };
}

function classifyError(message: string | null): TimesheetErrorKind {
  if (!message) return "unknown";
  if (message === RBAC_DENIED_MESSAGE || /permess/i.test(message)) return "rbac";
  if (/fetch|network|failed/i.test(message)) return "network";
  return "unknown";
}

function queryErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  return error.message || "Errore di caricamento.";
}

function canSyncFromDipendenti(dipendentiOpts: {
  source: "app_settings" | "fallback" | "unavailable";
  isLoading: boolean;
  records: readonly DipendenteRecord[];
}): boolean {
  return dipendentiOpts.source === "app_settings" && !dipendentiOpts.isLoading && dipendentiOpts.records.length > 0;
}

export function useDipendentiTimesheet(
  monthKeyOrOptions: TimesheetMonthKey | UseDipendentiTimesheetOptions,
) {
  const { monthKey, periodMode, weekAnchor, dayDate } = normalizeOptions(monthKeyOrOptions);
  const queryClient = useQueryClient();
  const dipendentiOpts = useDipendentiRecords();
  const tipiOpts = useTipiAssenza();
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saved" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  /** Solo durante mutateAsync sync (non include refetch post-invalidate). */
  const [syncInProgress, setSyncInProgress] = useState(false);
  const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingInputsRef = useRef<Map<string, TimesheetEntryUpsert>>(new Map());
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSyncKeyRef = useRef<string | null>(null);
  usePwaUpdateGuard(
    saveStatus === "pending" || syncInProgress,
    "Attendi il completamento del salvataggio del timesheet prima di aggiornare l'app.",
  );

  const periodRange = useMemo(
    () =>
      resolvePeriodRange(
        periodMode,
        monthKey,
        weekAnchor || undefined,
        dayDate || undefined,
      ),
    [periodMode, monthKey, weekAnchor, dayDate],
  );

  const periodDays = useMemo(
    () => buildPeriodDays(periodMode, monthKey, weekAnchor || undefined, dayDate || undefined),
    [periodMode, monthKey, weekAnchor, dayDate],
  );

  const previousMonthKey = useMemo(() => shiftMonthKey(monthKey, -1), [monthKey]);

  const dipendentiReady = dipendentiOpts.source === "app_settings" && !dipendentiOpts.isLoading;
  const realDipendentiRecords = useMemo(
    () => (dipendentiReady ? dipendentiOpts.records : []),
    [dipendentiReady, dipendentiOpts.records],
  );

  const currentDipendentiIds = useMemo(
    () => new Set(getActiveDipendentiRecords(realDipendentiRecords).map((r) => r.id)),
    [realDipendentiRecords],
  );

  const employeesQuery = useDipendentiEmployeesQuery();

  const registryReady = employeesQuery.isSuccess && !employeesQuery.isError;

  const entriesQueryKey = dipendentiEntriesQueryKey(periodRange.from, periodRange.to);

  const entriesQuery = useDipendentiEntriesRangeQuery(
    periodRange.from,
    periodRange.to,
    registryReady && dipendentiReady,
    { expectedServerKey: periodMode === "month" ? entriesQueryKey : undefined },
  );

  const previousMonthQuery = useServiceQuery(
    [...QK.dipendentiTimesheetEntries, "prev", previousMonthKey] as const,
    () => dipendentiTimesheetEntry.listEntriesForMonth(previousMonthKey),
    { enabled: registryReady && dipendentiReady && periodMode === "month" },
  );

  const monthKeysWithDataQuery = useDipendentiMonthKeysQuery(registryReady);

  const syncMutation = useServiceMutation(
    (records: readonly DipendenteRecord[]) =>
      dipendentiTimesheetEntry.syncFromAddettiRecords(records),
    {
      onSuccess: (rows) => {
        queryClient.setQueryData(QK.dipendentiTimesheetEmployees, rows);
        dispatchTimesheetEmployeesChanged(queryClient);
      },
    },
  );

  const runSyncFromDipendenti = useCallback(
    async (records: readonly DipendenteRecord[]) => {
      setSyncInProgress(true);
      try {
        return await syncMutation.mutateAsync(records);
      } finally {
        setSyncInProgress(false);
      }
    },
    [syncMutation],
  );

  const bootstrapEmployees = useCallback(async () => {
    if (dipendentiOpts.isLoading) {
      setSyncError("Attendere il caricamento dei dipendenti dalle Impostazioni.");
      return false;
    }
    if (dipendentiOpts.source !== "app_settings") {
      setSyncError("Impossibile sincronizzare: dipendenti non disponibili dalle Impostazioni.");
      return false;
    }
    if (!dipendentiOpts.records.length) {
      setSyncError("Nessun dipendente configurato in Impostazioni.");
      return false;
    }
    setSyncError(null);
    try {
      await runSyncFromDipendenti(dipendentiOpts.records);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossibile inizializzare il registro dipendenti.";
      setSyncError(msg);
      return false;
    }
  }, [dipendentiOpts.isLoading, dipendentiOpts.records, dipendentiOpts.source, runSyncFromDipendenti]);

  const dipendentiRecordsSyncKey = useMemo(
    () =>
      dipendentiOpts.records
        .map((r) => `${r.id}|${r.nome}|${r.cognome ?? ""}|${r.employeeType}|${r.attivo}`)
        .join(";"),
    [dipendentiOpts.records],
  );

  useEffect(() => {
    if (!canSyncFromDipendenti(dipendentiOpts)) return;
    if (autoSyncKeyRef.current === dipendentiRecordsSyncKey) return;
    autoSyncKeyRef.current = dipendentiRecordsSyncKey;
    void runSyncFromDipendenti(dipendentiOpts.records).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Sincronizzazione dipendenti non riuscita.";
      setSyncError(msg);
    });
  }, [dipendentiOpts, dipendentiRecordsSyncKey, runSyncFromDipendenti]);

  const upsertMutation = useServiceMutation(
    (input: TimesheetEntryUpsert) =>
      dipendentiTimesheetEntry.upsertEntry(input, tipiOpts.tipi),
    {
      onMutate: () => {
        setSaveStatus("pending");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      },
      onSuccess: (row, input) => {
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        const updateList = (key: readonly unknown[]) => {
          queryClient.setQueryData<DipendenteTimesheetEntryRow[]>(key, (prev) => {
            const list = prev ?? [];
            if (!row) {
              return list.filter(
                (e) => !(e.dipendente_id === input.dipendenteId && e.work_date === input.workDate),
              );
            }
            const idx = list.findIndex(
              (e) => e.dipendente_id === row.dipendente_id && e.work_date === row.work_date,
            );
            if (idx >= 0) {
              const next = [...list];
              next[idx] = row;
              return next;
            }
            return [...list, row];
          });
        };
        updateList(entriesQueryKey);
        if (periodMode === "month") {
          updateList([...QK.dipendentiTimesheetEntries, "prev", previousMonthKey]);
        }
        if (row) {
          dispatchTimesheetEntryChanged(queryClient, row.id, "entity_updated");
        } else {
          dispatchTimesheetEntryChanged(
            queryClient,
            `${input.dipendenteId}|${input.workDate}`,
            "entity_deleted",
          );
        }
        setSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => setSaveStatus("error"),
    },
  );

  const flushPending = useCallback(() => {
    for (const t of pendingRef.current.values()) clearTimeout(t);
    pendingRef.current.clear();
    for (const input of pendingInputsRef.current.values()) {
      void upsertMutation.mutateAsync(input);
    }
    pendingInputsRef.current.clear();
  }, [upsertMutation]);

  useEffect(() => {
    const onLeave = () => {
      for (const t of pendingRef.current.values()) clearTimeout(t);
      pendingRef.current.clear();
      for (const input of pendingInputsRef.current.values()) {
        void upsertMutation.mutate(input);
      }
      pendingInputsRef.current.clear();
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [upsertMutation]);

  useEffect(
    () => () => {
      flushPending();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [flushPending],
  );

  const scheduleSave = useCallback(
    (input: TimesheetEntryUpsert) => {
      const key = `${input.dipendenteId}|${input.workDate}`;
      pendingInputsRef.current.set(key, input);
      const existing = pendingRef.current.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        pendingRef.current.delete(key);
        pendingInputsRef.current.delete(key);
        void upsertMutation.mutateAsync(input);
      }, DEBOUNCE_MS);
      pendingRef.current.set(key, timer);
    },
    [upsertMutation],
  );

  const saveNow = useCallback(
    (input: TimesheetEntryUpsert) => {
      const key = `${input.dipendenteId}|${input.workDate}`;
      const existing = pendingRef.current.get(key);
      if (existing) clearTimeout(existing);
      pendingRef.current.delete(key);
      pendingInputsRef.current.delete(key);
      return upsertMutation.mutateAsync(input);
    },
    [upsertMutation],
  );

  const employees = (employeesQuery.data ?? []) as DipendenteTimesheetEmployeeRow[];

  const { displayEmployees, employeeIdsWithEntriesInPeriod, getCellValue } = useDipendentiTimesheetDerived(
    employees,
    entriesQuery.data ?? [],
    realDipendentiRecords,
    dipendentiReady,
    currentDipendentiIds,
  );

  const employeesError = employeesQuery.isError ? queryErrorMessage(employeesQuery.error) : null;
  const entriesError = entriesQuery.isError ? queryErrorMessage(entriesQuery.error) : null;
  const entriesDegraded = entriesError != null && Boolean(entriesQuery.data?.length);

  const loadPhase = useMemo((): TimesheetLoadPhase => {
    if (employeesError) return "error";
    if (!dipendentiReady || dipendentiOpts.isLoading) return "settings";
    if (employeesQuery.isLoading) return "registry";
    if (entriesQuery.isLoading && entriesQuery.data == null) return "entries";
    if (entriesError && entriesQuery.data == null) return "error";
    return "ready";
  }, [
    employeesError,
    entriesError,
    entriesQuery.data,
    dipendentiReady,
    dipendentiOpts.isLoading,
    employeesQuery.isLoading,
    entriesQuery.isLoading,
  ]);

  const errorKind = useMemo((): TimesheetErrorKind | null => {
    if (syncError) return "sync";
    const msg = employeesError ?? entriesError;
    if (!msg) return null;
    return classifyError(msg);
  }, [syncError, employeesError, entriesError]);

  const isInitialLoading = loadPhase !== "ready" && loadPhase !== "error";
  const isSyncing = syncInProgress;
  /** Sync in background dopo il primo caricamento (es. addetti aggiornati in Impostazioni). */
  const showBackgroundSyncInToolbar = syncInProgress && loadPhase === "ready";

  return {
    monthKey,
    periodMode,
    periodRange,
    periodDays,
    weekAnchor,
    dayDate,
    employees,
    displayEmployees,
    employeeIdsWithEntriesInPeriod,
    entries: entriesQuery.data ?? [],
    previousMonthEntries: previousMonthQuery.data ?? [],
    tipiAssenza: tipiOpts.tipi,
    dipendentiRecords: realDipendentiRecords,
    dipendentiReady,
    dipendentiSource: dipendentiOpts.source,
    hasRealDipendenti: dipendentiReady && realDipendentiRecords.length > 0,
    loadPhase,
    errorKind,
    isInitialLoading,
    isSyncing,
    showBackgroundSyncInToolbar,
    employeesError,
    entriesError,
    entriesDegraded,
    syncError,
    bootstrapEmployees,
    monthKeysWithData: monthKeysWithDataQuery.data ?? [],
    refetch: () => {
      void employeesQuery.refetch();
      void entriesQuery.refetch();
      void previousMonthQuery.refetch();
      void monthKeysWithDataQuery.refetch();
    },
    refetchEmployees: () => {
      void employeesQuery.refetch();
    },
    refetchEntries: () => {
      void entriesQuery.refetch();
    },
    getCellValue,
    scheduleSave,
    saveNow,
    saveStatus,
    canWrite: !upsertMutation.isPending,
    upsertPending: upsertMutation.isPending,
  };
}

export function useDefaultTimesheetMonthKey(): TimesheetMonthKey {
  const [key] = useState<TimesheetMonthKey>(() => monthKeyFromDate(new Date()));
  return key;
}

export type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow, TimesheetEntryUpsert, TimesheetPeriodMode };
