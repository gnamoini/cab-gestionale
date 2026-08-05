"use client";

import { isPreventivoEditableByStaff } from "@/lib/preventivi/preventivo-edit-lock";
import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { preventiviService, type PreventivoUpdate } from "@/src/services/preventivi.service";
import { err } from "@/src/services/service-result";

async function updatePreventivo(id: string, data: PreventivoUpdate) {
  const existing = await preventiviService.getById(id);
  if (!existing.success) return existing;
  if (!existing.data || !isPreventivoEditableByStaff(existing.data)) {
    return err("Il preventivo non è modificabile in questo stato.");
  }
  return preventiviService.update(id, data);
}

export const preventiviEntry = {
  getAll: preventiviService.getAll.bind(preventiviService),
  getById: preventiviService.getById.bind(preventiviService),
  create: withPageWriteGuard("preventivi", preventiviService.create.bind(preventiviService)),
  update: withPageWriteGuard("preventivi", updatePreventivo),
  remove: withPageWriteGuard("preventivi", preventiviService.remove.bind(preventiviService)),
  transitionStatus: withPageWriteGuard("preventivi", preventiviService.transitionStatus.bind(preventiviService)),
};

export type { PreventiviFilters, PreventivoInsert, PreventivoUpdate } from "@/src/services/preventivi.service";
export { preventiviInferTotaleDaDettagli } from "@/src/services/preventivi.service";
