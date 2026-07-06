"use client";

import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import {
  lavorazioneDocumentsService,
} from "@/src/services/lavorazione-documents.service";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";

export const lavorazioneDocumentsEntry = {
  listByLavorazione: lavorazioneDocumentsService.listByLavorazione.bind(lavorazioneDocumentsService),

  async upload(
    lavorazioneId: string,
    tipo: LavorazioneDocumentTipo,
    file: File,
  ): Promise<ServiceResult<LavorazioneDocumentRow>> {
    const allowed = await ensurePageWrite("lavorazioni");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioneDocumentsService.upload(lavorazioneId, tipo, file);
  },

  async remove(lavorazioneId: string, tipo: LavorazioneDocumentTipo): Promise<ServiceResult<null>> {
    const allowed = await ensurePageWrite("lavorazioni");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return lavorazioneDocumentsService.remove(lavorazioneId, tipo);
  },
};
