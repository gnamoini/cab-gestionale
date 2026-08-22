"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { ordiniFornitoriService } from "@/src/services/ordini-fornitori.service";

export const ordiniFornitoriEntry = {
  getList: ordiniFornitoriService.getList.bind(ordiniFornitoriService),
  getDetail: ordiniFornitoriService.getDetail.bind(ordiniFornitoriService),
  create: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.create.bind(ordiniFornitoriService)),
  updateDraft: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.updateDraft.bind(ordiniFornitoriService)),
  updateStatus: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.updateStatus.bind(ordiniFornitoriService)),
  annulla: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.annulla.bind(ordiniFornitoriService)),
  deleteOrdine: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.deleteOrdine.bind(ordiniFornitoriService)),
  receiveDelivery: withPageWriteGuard("ordini_fornitori", ordiniFornitoriService.receiveDelivery.bind(ordiniFornitoriService)),
};
