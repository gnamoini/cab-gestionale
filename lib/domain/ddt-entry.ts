"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { ddtService } from "@/src/services/ddt.service";

export const ddtEntry = {
  getList: ddtService.getList.bind(ddtService),
  fetchIndexByPreventivoIds: ddtService.fetchIndexByPreventivoIds.bind(ddtService),
  getActiveByPreventivoId: ddtService.getActiveByPreventivoId.bind(ddtService),
  getDetail: ddtService.getDetail.bind(ddtService),
  create: withPageWriteGuard("preventivi", ddtService.create.bind(ddtService)),
  createOrReplaceForPreventivo: withPageWriteGuard("preventivi", ddtService.createOrReplaceForPreventivo.bind(ddtService)),
  confirm: withPageWriteGuard("preventivi", ddtService.confirm.bind(ddtService)),
  markStampato: withPageWriteGuard("preventivi", ddtService.markStampato.bind(ddtService)),
  markConsegnato: withPageWriteGuard("preventivi", ddtService.markConsegnato.bind(ddtService)),
  cancel: withPageWriteGuard("preventivi", ddtService.cancel.bind(ddtService)),
  removeDraft: withPageWriteGuard("preventivi", ddtService.removeDraft.bind(ddtService)),
};
