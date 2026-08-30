"use client";

import { LAVORAZIONE_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

/** @deprecated Upload manuali rimossi — documenti ufficiali via pdf_artifacts SSOT. */
export const lavorazioneDocumentsService = {
  async listByLavorazione(lavorazioneId: string): Promise<ServiceResult<LavorazioneDocumentRow[]>> {
    try {
      const id = lavorazioneId.trim();
      if (!id) return success([]);
      const sb = await getBrowserSupabase();
      const { data, error } = await sb
        .from("lavorazione_documents")
        .select(LAVORAZIONE_DOCUMENTS_COLUMNS)
        .eq("lavorazione_id", id)
        .order("uploaded_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as LavorazioneDocumentRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upload(): Promise<ServiceResult<LavorazioneDocumentRow>> {
    return err("Upload documenti lavorazione non più supportato. Usare preventivi/DDT ufficiali.");
  },

  async remove(): Promise<ServiceResult<null>> {
    return err("Rimozione documenti lavorazione non più supportata.");
  },

  async purgeForLavorazione(lavorazioneId: string): Promise<ServiceResult<null>> {
    void lavorazioneId;
    return success(null);
  },
};
