"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import {
  workshopScheduleService,
  type WorkshopSchedulePatchTimesInput,
  type WorkshopScheduleUpsertInput,
} from "@/src/services/workshop-schedule.service";

export const workshopScheduleEntry = {
  listRange: workshopScheduleService.listRange.bind(workshopScheduleService),
  enrichedView: workshopScheduleService.enrichedView.bind(workshopScheduleService),
  listByWorkOrder: workshopScheduleService.listByWorkOrder.bind(workshopScheduleService),
  detectConflicts: workshopScheduleService.detectConflicts.bind(workshopScheduleService),
  upsert: withPageWriteGuard("agenda", workshopScheduleService.upsert.bind(workshopScheduleService)),
  patchTimes: withPageWriteGuard("agenda", workshopScheduleService.patchTimes.bind(workshopScheduleService)),
  softDelete: withPageWriteGuard("agenda", workshopScheduleService.softDelete.bind(workshopScheduleService)),
  migratePromemoria: withPageWriteGuard("agenda", workshopScheduleService.migratePromemoria.bind(workshopScheduleService)),
};

export type { WorkshopSchedulePatchTimesInput, WorkshopScheduleUpsertInput };
