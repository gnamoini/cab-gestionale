"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { magazzinoService } from "@/src/services/magazzino.service";

export const magazzinoEntry = {
  getAll: magazzinoService.getAll.bind(magazzinoService),
  getAllForReport: magazzinoService.getAllForReport.bind(magazzinoService),
  getById: magazzinoService.getById.bind(magazzinoService),
  create: withPageWriteGuard("magazzino", magazzinoService.create.bind(magazzinoService)),
  update: withPageWriteGuard("magazzino", magazzinoService.update.bind(magazzinoService)),
  remove: withPageWriteGuard("magazzino", magazzinoService.remove.bind(magazzinoService)),
};

export type { MagazzinoFilters, MagazzinoInsert, MagazzinoUpdate } from "@/src/services/magazzino.service";
