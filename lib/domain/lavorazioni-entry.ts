"use client";

import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import {
  lavorazioniService,
  type LavorazioneInsert,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneRow, StatoLavorazione } from "@/src/types/supabase-tables";

async function guardWrite(): Promise<ServiceResult<true>> {
  return ensurePageWrite("lavorazioni");
}

export const lavorazioniEntry = {
  async create(data: LavorazioneInsert): Promise<ServiceResult<LavorazioneRow>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.create(data);
  },

  async update(id: string, data: LavorazioneUpdate): Promise<ServiceResult<LavorazioneRow>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.update(id, data);
  },

  async restore(id: string, stato: StatoLavorazione): Promise<ServiceResult<LavorazioneRow>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.restore(id, stato);
  },

  async conclude(id: string): Promise<ServiceResult<LavorazioneRow>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.conclude(id);
  },

  async updateArchivioCompletamento(
    id: string,
    completionYmd: string,
  ): Promise<ServiceResult<LavorazioneRow>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.updateArchivioCompletamento(id, completionYmd);
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    const allowed = await guardWrite();
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioniService.remove(id);
  },

  /** Read helpers used from hooks after list auth at page level. */
  listAddettiInUso: lavorazioniService.getAddettiInUso.bind(lavorazioniService),
  listStatiInUso: lavorazioniService.getStatiInUso.bind(lavorazioniService),
};
