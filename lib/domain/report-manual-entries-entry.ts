"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import {
  reportManualEntriesService,
  type ReportManualEntryUpsert,
} from "@/src/services/report-manual-entries.service";

export const reportManualEntriesEntry = {
  list: reportManualEntriesService.list.bind(reportManualEntriesService),
  upsert: withPageWriteGuard("report", reportManualEntriesService.upsert.bind(reportManualEntriesService)),
  remove: withPageWriteGuard("report", reportManualEntriesService.remove.bind(reportManualEntriesService)),
};

export type { ReportManualEntryUpsert };
