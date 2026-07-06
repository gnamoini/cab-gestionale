"use client";

import { ensureClientLavorazioniAccess } from "@/src/lib/auth/permission-guards";
import {
  clientLavorazioniService,
  type ClientLavorazioneDetail,
} from "@/src/services/client-lavorazioni.service";
import { err, type ServiceResult } from "@/src/services/service-result";

export const clientLavorazioniEntry = {
  async getDetail(lavorazioneId: string): Promise<ServiceResult<ClientLavorazioneDetail>> {
    const allowed = await ensureClientLavorazioniAccess();
    if (!allowed.success) return err(allowed.error ?? "Accesso negato.");
    return clientLavorazioniService.getDetail(lavorazioneId);
  },
};

export type { ClientLavorazioneDetail };
