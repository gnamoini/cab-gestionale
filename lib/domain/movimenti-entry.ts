"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { movimentiService } from "@/src/services/movimenti.service";

export const movimentiEntry = {
  getAll: movimentiService.getAll.bind(movimentiService),
  create: withPageWriteGuard("magazzino", movimentiService.create.bind(movimentiService)),
  update: withPageWriteGuard("magazzino", movimentiService.update.bind(movimentiService)),
  remove: withPageWriteGuard("magazzino", movimentiService.remove.bind(movimentiService)),
};

export type { MovimentiFilters } from "@/src/services/movimenti.service";
