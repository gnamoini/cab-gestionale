"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { attrezzatureService } from "@/src/services/attrezzature.service";

export const attrezzatureEntry = {
  listByMezzo: attrezzatureService.listByMezzo.bind(attrezzatureService),
  getById: attrezzatureService.getById.bind(attrezzatureService),
  findByMatricola: attrezzatureService.findByMatricola.bind(attrezzatureService),
  create: withPageWriteGuard("mezzi", attrezzatureService.create.bind(attrezzatureService)),
  update: withPageWriteGuard("mezzi", attrezzatureService.update.bind(attrezzatureService)),
  remove: withPageWriteGuard("mezzi", attrezzatureService.remove.bind(attrezzatureService)),
};
