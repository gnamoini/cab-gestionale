"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { sourceVersionFromUpdatedAt } from "@/lib/integrations/unoerp/cab-source-version";
import { requestUnoerpEnqueue, requestUnoerpMarkLocal } from "@/lib/integrations/unoerp/client-enqueue";
import { ddtService } from "@/src/services/ddt.service";

async function confirmDdt(id: string) {
  const res = await ddtService.confirm(id);
  if (res.success) {
    const detail = await ddtService.getDetail(id);
    if (detail.success && detail.data) {
      const doc = detail.data.document;
      void requestUnoerpEnqueue({
        cabDocumentType: "ddt",
        cabDocumentId: id,
        sourceVersion: sourceVersionFromUpdatedAt(doc.updated_at, doc.source_version),
        payloadHash: `${doc.anno}:${doc.serie}:${doc.numero}:${doc.updated_at}`,
        operation: "CREATE",
        payloadSnapshot: { anno: doc.anno, serie: doc.serie, numero: doc.numero },
      });
    }
  }
  return res;
}

async function cancelDdt(id: string) {
  const res = await ddtService.cancel(id);
  if (res.success) {
    void requestUnoerpMarkLocal({
      cabDocumentType: "ddt",
      cabDocumentId: id,
      status: "CAB_DDT_CANCELLED_AFTER_SYNC",
    });
  }
  return res;
}

export const ddtEntry = {
  getList: ddtService.getList.bind(ddtService),
  fetchIndexByPreventivoIds: ddtService.fetchIndexByPreventivoIds.bind(ddtService),
  getActiveByPreventivoId: ddtService.getActiveByPreventivoId.bind(ddtService),
  getDetail: ddtService.getDetail.bind(ddtService),
  create: withPageWriteGuard("preventivi", ddtService.create.bind(ddtService)),
  createOrReplaceForPreventivo: withPageWriteGuard("preventivi", ddtService.createOrReplaceForPreventivo.bind(ddtService)),
  confirm: withPageWriteGuard("preventivi", confirmDdt),
  markStampato: withPageWriteGuard("preventivi", ddtService.markStampato.bind(ddtService)),
  markConsegnato: withPageWriteGuard("preventivi", ddtService.markConsegnato.bind(ddtService)),
  cancel: withPageWriteGuard("preventivi", cancelDdt),
  removeDraft: withPageWriteGuard("preventivi", ddtService.removeDraft.bind(ddtService)),
};
