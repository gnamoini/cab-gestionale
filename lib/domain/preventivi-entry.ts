"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { preventiviService } from "@/src/services/preventivi.service";

export const preventiviEntry = {
  getAll: preventiviService.getAll.bind(preventiviService),
  getById: preventiviService.getById.bind(preventiviService),
  create: withPageWriteGuard("preventivi", preventiviService.create.bind(preventiviService)),
  update: withPageWriteGuard("preventivi", preventiviService.update.bind(preventiviService)),
  remove: withPageWriteGuard("preventivi", preventiviService.remove.bind(preventiviService)),
};

export type { PreventiviFilters, PreventivoInsert, PreventivoUpdate } from "@/src/services/preventivi.service";
export { preventiviInferTotaleDaDettagli } from "@/src/services/preventivi.service";
