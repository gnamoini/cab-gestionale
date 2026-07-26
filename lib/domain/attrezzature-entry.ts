"use client";

import { buildBrowserAttrezzaturaResolveDeps } from "@/lib/domain/mezzo-attrezzatura/build-browser-attrezzatura-resolve-deps";
import {
  resolveOrCreateAttrezzatura,
  type AttrezzaturaResolveInsert,
} from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { attrezzatureService } from "@/src/services/attrezzature.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

async function resolveOrCreateAttrezzaturaClient(input: {
  mezzoId: string;
  incoming: AttrezzaturaResolveInsert;
  hintId?: string | null;
}): Promise<ServiceResult<AttrezzaturaRow>> {
  try {
    const deps = await buildBrowserAttrezzaturaResolveDeps();
    const result = await resolveOrCreateAttrezzatura(input, deps);
    return success(result.row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore attrezzatura.";
    return err(message);
  }
}

export const attrezzatureEntry = {
  listByMezzo: attrezzatureService.listByMezzo.bind(attrezzatureService),
  getById: attrezzatureService.getById.bind(attrezzatureService),
  findByMatricola: attrezzatureService.findByMatricola.bind(attrezzatureService),
  resolveOrCreate: withPageWriteGuard("mezzi", resolveOrCreateAttrezzaturaClient),
  update: withPageWriteGuard("mezzi", attrezzatureService.update.bind(attrezzatureService)),
  remove: withPageWriteGuard("mezzi", attrezzatureService.remove.bind(attrezzatureService)),
};
