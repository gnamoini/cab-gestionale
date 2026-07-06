"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { documentiService } from "@/src/services/documenti.service";

export const documentiEntry = {
  getAll: documentiService.getAll.bind(documentiService),
  getById: documentiService.getById.bind(documentiService),
  create: withPageWriteGuard("documenti", documentiService.create.bind(documentiService)),
  update: withPageWriteGuard("documenti", documentiService.update.bind(documentiService)),
  remove: withPageWriteGuard("documenti", documentiService.remove.bind(documentiService)),
};

export type { DocumentiFilters } from "@/src/services/documenti.service";
