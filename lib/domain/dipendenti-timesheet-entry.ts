"use client";

import { withPageReadGuard, withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";

export const dipendentiTimesheetEntry = {
  listEmployees: withPageReadGuard("dipendenti", dipendentiTimesheetService.listEmployees.bind(dipendentiTimesheetService)),
  syncFromAddettiRecords: withPageWriteGuard("dipendenti", dipendentiTimesheetService.syncFromAddettiRecords.bind(dipendentiTimesheetService)),
  syncFromAddetti: withPageWriteGuard("dipendenti", dipendentiTimesheetService.syncFromAddetti.bind(dipendentiTimesheetService)),
  listEntriesForMonth: withPageReadGuard("dipendenti", dipendentiTimesheetService.listEntriesForMonth.bind(dipendentiTimesheetService)),
  listMonthKeysWithEntries: withPageReadGuard("dipendenti", dipendentiTimesheetService.listMonthKeysWithEntries.bind(dipendentiTimesheetService)),
  listEmployeeIdsWithEntries: withPageReadGuard("dipendenti", dipendentiTimesheetService.listEmployeeIdsWithEntries.bind(dipendentiTimesheetService)),
  listEntriesForRange: withPageReadGuard("dipendenti", dipendentiTimesheetService.listEntriesForRange.bind(dipendentiTimesheetService)),
  upsertEntry: withPageWriteGuard("dipendenti", dipendentiTimesheetService.upsertEntry.bind(dipendentiTimesheetService)),
  deleteEntry: withPageWriteGuard("dipendenti", dipendentiTimesheetService.deleteEntry.bind(dipendentiTimesheetService)),
};
