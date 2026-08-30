"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DocumentAiIndexRow } from "@/lib/documents/document-ai-list-status";
import { deriveDocumentAiListStatus } from "@/lib/documents/document-ai-list-status";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export type DocumentAiIndexStatusMap = Map<string, DocumentAiIndexRow>;

async function fetchDocumentAiIndexStatusMap(documentoIds: string[]): Promise<DocumentAiIndexStatusMap> {
  if (documentoIds.length === 0) return new Map();

  const sb = getBrowserSupabase();
  const { data, error } = await sb
    .from("document_ai_index")
    .select("documento_id, status, understanding_status")
    .in("documento_id", documentoIds)
    .eq("is_active", true);

  if (error) throw error;

  const map: DocumentAiIndexStatusMap = new Map();
  for (const row of data ?? []) {
    map.set(row.documento_id, {
      status: row.status,
      understandingStatus: row.understanding_status,
    });
  }
  return map;
}

function mapNeedsPoll(ids: string[], map: DocumentAiIndexStatusMap | undefined): boolean {
  if (!map) return false;
  return ids.some((id) => {
    const status = deriveDocumentAiListStatus({ aiEnabled: true, index: map.get(id) ?? null });
    return status === "pending" || status === "processing";
  });
}

export function useDocumentAiIndexStatusMap(aiEnabledDocumentoIds: string[]) {
  const sortedKey = useMemo(() => [...aiEnabledDocumentoIds].sort().join(","), [aiEnabledDocumentoIds]);

  const query = useQuery({
    queryKey: ["document-ai-index-status", sortedKey] as const,
    queryFn: () => fetchDocumentAiIndexStatusMap(aiEnabledDocumentoIds),
    enabled: aiEnabledDocumentoIds.length > 0,
    staleTime: 20_000,
    refetchInterval: (q) => (mapNeedsPoll(aiEnabledDocumentoIds, q.state.data) ? 8_000 : false),
  });

  return {
    ...query,
    map: query.data ?? new Map<string, DocumentAiIndexRow>(),
  };
}
