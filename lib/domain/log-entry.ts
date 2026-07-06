"use client";

import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { err } from "@/src/services/service-result";
import { logService } from "@/src/services/log.service";

export const logEntry = {
  getAll: logService.getAll.bind(logService),
  getByEntita: logService.getByEntita.bind(logService),
  getById: logService.getById.bind(logService),
  create: logService.create.bind(logService),
  async markReverted(
    id: string,
    input: { reverted_by?: string | null; undo_log_id?: string | null; pageKey?: GestionalePageKey },
  ) {
    const allowed = await ensurePageWrite(input.pageKey ?? "lavorazioni");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return logService.markReverted(id, input);
  },
};

export type { LogFilters, LogInsert } from "@/src/services/log.service";
