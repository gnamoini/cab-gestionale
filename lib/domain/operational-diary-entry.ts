"use client";

import { withPageReadGuard, withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import {
  operationalDiaryService,
  type OperationalDiaryUpsert,
} from "@/src/services/operational-diary.service";

export const operationalDiaryEntry = {
  list: withPageReadGuard("dashboard", operationalDiaryService.list.bind(operationalDiaryService)),
  upsert: withPageWriteGuard("dashboard", operationalDiaryService.upsert.bind(operationalDiaryService)),
};

export type { OperationalDiaryUpsert };
