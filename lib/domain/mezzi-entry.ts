"use client";

import { buildBrowserMezzoResolveDeps } from "@/lib/domain/mezzo/build-browser-mezzo-resolve-deps";
import {
  resolveOrCreateMezzo,
  type MezzoResolveInsert,
} from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import {
  mezziService,
  type MezzoFilters,
  type MezzoInsert,
  type MezzoUpdate,
  type MezzoDependencies,
} from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";

async function resolveOrCreateMezzoClient(
  input: MezzoResolveInsert & { hintId?: string | null },
): Promise<ServiceResult<MezzoRow>> {
  try {
    const deps = await buildBrowserMezzoResolveDeps();
    const { hintId, ...incoming } = input;
    const result = await resolveOrCreateMezzo({ incoming, hintId }, deps);
    return success(result.row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore mezzo.";
    return err(message);
  }
}

export const mezziEntry = {
  getAll: mezziService.getAll.bind(mezziService),
  getAllForReport: mezziService.getAllForReport.bind(mezziService),
  getById: mezziService.getById.bind(mezziService),
  countDependencies: mezziService.countDependencies.bind(mezziService),
  resolveOrCreate: withPageWriteGuard("mezzi", resolveOrCreateMezzoClient),

  async create(data: MezzoInsert): Promise<ServiceResult<MezzoRow>> {
    const allowed = await ensurePageWrite("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return mezziService.create(data);
  },

  async update(id: string, data: MezzoUpdate): Promise<ServiceResult<MezzoRow>> {
    const allowed = await ensurePageWrite("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return mezziService.update(id, data);
  },

  async setTagliandiEnabled(id: string, enabled: boolean): Promise<ServiceResult<MezzoRow>> {
    const allowed = await ensurePageWrite("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return mezziService.setTagliandiEnabled(id, enabled);
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    const allowed = await ensurePageWrite("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return mezziService.remove(id);
  },
};

export type { MezzoFilters, MezzoInsert, MezzoUpdate, MezzoDependencies };
export {
  mezzoDeleteBlockedBy,
  mezzoDeleteBlockedByLavorazioni,
} from "@/src/services/mezzi.service";
