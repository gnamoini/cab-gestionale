"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { ordiniFornitoriService } from "@/src/services/ordini-fornitori.service";

export const ordiniFornitoriEntry = {
  getList: ordiniFornitoriService.getList.bind(ordiniFornitoriService),
  getDetail: ordiniFornitoriService.getDetail.bind(ordiniFornitoriService),
  create: withPageWriteGuard("preventivi", ordiniFornitoriService.create.bind(ordiniFornitoriService)),
  updateDraft: withPageWriteGuard("preventivi", ordiniFornitoriService.updateDraft.bind(ordiniFornitoriService)),
  annulla: withPageWriteGuard("preventivi", ordiniFornitoriService.annulla.bind(ordiniFornitoriService)),
  deleteBozza: withPageWriteGuard("preventivi", ordiniFornitoriService.deleteBozza.bind(ordiniFornitoriService)),
};
