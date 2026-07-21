"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { movimentiService } from "@/src/services/movimenti.service";
import { err } from "@/src/services/service-result";

export const movimentiEntry = {
  getAll: movimentiService.getAll.bind(movimentiService),
  create: withPageWriteGuard("magazzino", movimentiService.create.bind(movimentiService)),
  storno: withPageWriteGuard("magazzino", movimentiService.storno.bind(movimentiService)),
  update: withPageWriteGuard("magazzino", movimentiService.update.bind(movimentiService)),
  remove: withPageWriteGuard("magazzino", async () => err("Eliminazione movimento non consentita. Usa storno.")),
};

export type { MovimentiFilters } from "@/src/services/movimenti.service";
