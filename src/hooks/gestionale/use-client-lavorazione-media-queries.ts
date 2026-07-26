"use client";

import { useQuery } from "@tanstack/react-query";
import { listStoredImages, type StoredImage } from "@/lib/media/image-storage";
import type { ClientLavorazioneDocumentsPayload } from "@/lib/official-documents/types";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";

export type ClientLavorazioneDocumentsPayloadLegacy = ClientLavorazioneDocumentsPayload;

export function useClientLavorazioneDocumentsQuery(lavorazioneId: string, enabled = true) {
  const id = lavorazioneId.trim();
  const opts = useViewQueryOpts();
  return useQuery({
    queryKey: [...QK.clientLavorazioneDocuments, id] as const,
    queryFn: async (): Promise<ClientLavorazioneDocumentsPayload> => {
      const res = await fetch(
        `/api/lavorazioni/${encodeURIComponent(id)}/official-documents?surface=client`,
        { credentials: "same-origin" },
      );
      const body = (await res.json()) as ClientLavorazioneDocumentsPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Errore documenti lavorazione.");
      return body;
    },
    enabled: enabled && id.length > 0,
    ...opts,
  });
}

export function useClientLavorazionePhotosQuery(
  lavorazioneId: string,
  opts?: { max?: number; enabled?: boolean },
) {
  const id = lavorazioneId.trim();
  const max = opts?.max;
  const enabled = opts?.enabled !== false;
  const queryOpts = useViewQueryOpts();
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
