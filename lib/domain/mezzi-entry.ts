"use client";

import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import {
  mezziService,
  type MezzoFilters,
  type MezzoInsert,
  type MezzoUpdate,
  type MezzoDependencies,
} from "@/src/services/mezzi.service";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";

export const mezziEntry = {
  getAll: mezziService.getAll.bind(mezziService),
  getAllForReport: mezziService.getAllForReport.bind(mezziService),
  getById: mezziService.getById.bind(mezziService),
  countDependencies: mezziService.countDependencies.bind(mezziService),

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
