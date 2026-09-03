"use client";

import { isPreventivoEditableByStaff } from "@/lib/preventivi/preventivo-edit-lock";
import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { cabDocumentTypeFromPreventivoRow, sourceVersionFromUpdatedAt } from "@/lib/integrations/unoerp/cab-source-version";
import { requestUnoerpEnqueue, requestUnoerpMarkLocal } from "@/lib/integrations/unoerp/client-enqueue";
import { preventiviService, type PreventivoInsert, type PreventivoUpdate } from "@/src/services/preventivi.service";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { PreventivoRow } from "@/src/types/supabase-tables";

function enqueuePreventivo(row: PreventivoRow, operation: "CREATE" | "UPDATE") {
  const type = cabDocumentTypeFromPreventivoRow(row);
  void requestUnoerpEnqueue({
    cabDocumentType: type,
    cabDocumentId: row.id,
    sourceVersion: sourceVersionFromUpdatedAt(row.updated_at, row.versione),
    payloadHash: `${row.versione}:${row.totale}:${row.updated_at}`,
    operation,
    payloadSnapshot: { totale: row.totale, versione: row.versione },
  });
}

async function createPreventivo(data: PreventivoInsert): Promise<ServiceResult<PreventivoRow>> {
  const res = await preventiviService.create(data);
  if (res.success && res.data) enqueuePreventivo(res.data, "CREATE");
  return res;
}

async function updatePreventivo(id: string, data: PreventivoUpdate) {
  const existing = await preventiviService.getById(id);
  if (!existing.success) return existing;
  if (!existing.data || !isPreventivoEditableByStaff(existing.data)) {
    return err("Il preventivo non è modificabile in questo stato.");
  }
  const res = await preventiviService.update(id, data);
  if (res.success && res.data) enqueuePreventivo(res.data, "UPDATE");
  return res;
}

async function removePreventivo(id: string) {
  const res = await preventiviService.remove(id);
  if (res.success) {
    void requestUnoerpMarkLocal({
      cabDocumentType: "preventivo",
      cabDocumentId: id,
      status: "CAB_DOCUMENT_REMOVED",
    });
  }
  return res;
}

export const preventiviEntry = {
  getAll: preventiviService.getAll.bind(preventiviService),
  getById: preventiviService.getById.bind(preventiviService),
  create: withPageWriteGuard("preventivi", createPreventivo),
  update: withPageWriteGuard("preventivi", updatePreventivo),
  remove: withPageWriteGuard("preventivi", removePreventivo),
  transitionStatus: withPageWriteGuard("preventivi", preventiviService.transitionStatus.bind(preventiviService)),
};

export type { PreventiviFilters, PreventivoInsert, PreventivoUpdate } from "@/src/services/preventivi.service";
export { preventiviInferTotaleDaDettagli } from "@/src/services/preventivi.service";
