"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";

/** Cross-tab + Realtime: registro dipendenti timesheet aggiornato. */
export function dispatchTimesheetEmployeesChanged(qc: QueryClient): void {
  dispatchGestionaleLocalMutation(qc, ["dipendenti_timesheet_employees"], [
    cabSyncEventForEntity(
      "dipendenti_timesheet_employees",
      "registry",
      "entity_updated",
      "dipendenti_timesheet_employees",
    ),
  ]);
}

/** Cross-tab + Realtime: cella / entry timesheet mutata. */
export function dispatchTimesheetEntryChanged(
  qc: QueryClient,
  id: string,
  type: "entity_created" | "entity_updated" | "entity_deleted",
): void {
  dispatchGestionaleLocalMutation(qc, ["dipendenti_timesheet_entries"], [
    cabSyncEventForEntity("dipendenti_timesheet_entries", id, type, "dipendenti_timesheet_entries"),
  ]);
}
