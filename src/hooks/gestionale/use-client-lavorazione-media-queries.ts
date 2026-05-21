"use client";

import { useQuery } from "@tanstack/react-query";
import { listStoredImages, type StoredImage } from "@/lib/media/image-storage";
import { useClientPortalQueryOpts } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { lavorazioneDocumentsService } from "@/src/services/lavorazione-documents.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";

export type ClientLavorazioneDocumentsPayload = {
  rows: LavorazioneDocumentRow[];
  urls: Record<string, string>;
};

export function useClientLavorazioneDocumentsQuery(lavorazioneId: string, enabled = true) {
  const id = lavorazioneId.trim();
  const opts = useClientPortalQueryOpts();
  return useServiceQuery<
    ClientLavorazioneDocumentsPayload,
    readonly ["client_lavorazione_documents", string]
  >(
    [...QK.clientLavorazioneDocuments, id] as const,
    async (): Promise<ServiceResult<ClientLavorazioneDocumentsPayload>> => {
      const res = await lavorazioneDocumentsService.listWithUrls(id);
      if (!res.success) return err(res.error ?? "Errore documenti lavorazione.");
      const data = res.data ?? [];
      const urls: Record<string, string> = {};
      for (const r of data) urls[r.tipo] = r.signedUrl;
      return success({ rows: data, urls });
    },
    { enabled: enabled && id.length > 0, ...opts },
  );
}

export function useClientLavorazionePhotosQuery(
  lavorazioneId: string,
  opts?: { max?: number; enabled?: boolean },
) {
  const id = lavorazioneId.trim();
  const max = opts?.max;
  const enabled = opts?.enabled !== false;
  const queryOpts = useClientPortalQueryOpts();
  return useQuery({
    queryKey: [...QK.clientLavorazionePhotos, id, max ?? "all"] as const,
    queryFn: async (): Promise<StoredImage[]> => {
      const all = await listStoredImages("lavorazioni", id);
      return max != null ? all.slice(0, max) : all;
    },
    enabled: enabled && id.length > 0,
    ...queryOpts,
  });
}
