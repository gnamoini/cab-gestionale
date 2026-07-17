"use client";

import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import { QK } from "@/src/lib/react-query/query-keys";

const DIPENDENTI_EMPLOYEES_SCOPE = "dipendenti.employees" as const;
const DIPENDENTI_MONTH_KEYS_SCOPE = "dipendenti.monthKeys" as const;
const DIPENDENTI_ENTRIES_SCOPE = "dipendenti.entries" as const;

export function dipendentiEntriesQueryKey(from: string, to: string) {
  return [...QK.dipendentiTimesheetEntries, from, to] as const;
}

export function useDipendentiEmployeesQuery() {
  const gestOpts = useGestionaleQueryOpts();
  return useSharedEntityQuery({
    queryKey: QK.dipendentiTimesheetEmployees,
    queryFn: () => dipendentiTimesheetEntry.listEmployees(),
    entityType: "dipendenti",
    scope: "employees",
    ownershipScopeKey: DIPENDENTI_EMPLOYEES_SCOPE,
    expectedServerKey: QK.dipendentiTimesheetEmployees,
    ...gestOpts,
  });
}

export function useDipendentiMonthKeysQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  return useSharedEntityQuery({
    queryKey: QK.dipendentiTimesheetMonthKeysWithData,
    queryFn: () => dipendentiTimesheetEntry.listMonthKeysWithEntries(),
    entityType: "dipendenti",
    scope: "monthKeys",
    ownershipScopeKey: DIPENDENTI_MONTH_KEYS_SCOPE,
    expectedServerKey: QK.dipendentiTimesheetMonthKeysWithData,
    enabled,
    ...gestOpts,
  });
}

export function useDipendentiEntriesRangeQuery(
  from: string,
  to: string,
  enabled: boolean,
  options?: { expectedServerKey?: readonly unknown[] },
) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = dipendentiEntriesQueryKey(from, to);
  return useSharedEntityQuery<DipendenteTimesheetEntryRow[], typeof queryKey>({
    queryKey,
    queryFn: () => dipendentiTimesheetEntry.listEntriesForRange(from, to),
    entityType: "dipendenti",
    scope: "entries",
    ownershipScopeKey: DIPENDENTI_ENTRIES_SCOPE,
    expectedServerKey: options?.expectedServerKey,
    enabled,
    ...gestOpts,
  });
}

export type { DipendenteTimesheetEmployeeRow };
