import "server-only";

import { nullIfBlankUuid } from "@/lib/document-capture/null-if-blank-uuid";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function patchDocumentCaptureInTransaction(input: {
  captureId: string;
  status?: string | null;
  documentCategory?: string | null;
  schedaTipo?: string | null;
  lavorazioneId?: string | null;
  mezzoId?: string | null;
  attrezzaturaId?: string | null;
  softDelete?: boolean;
  deletionReason?: string | null;
}): Promise<{ ok: true; id: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("document_capture_patch", {
    p_capture_id: input.captureId,
    p_status: input.status ?? null,
    p_document_category: input.documentCategory ?? null,
    p_scheda_tipo: input.schedaTipo ?? null,
    p_lavorazione_id: nullIfBlankUuid(input.lavorazioneId),
    p_mezzo_id: nullIfBlankUuid(input.mezzoId),
    p_attrezzatura_id: nullIfBlankUuid(input.attrezzaturaId),
    p_soft_delete: input.softDelete ?? false,
    p_deletion_reason: input.deletionReason ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as { ok?: boolean; id?: string };
  return { ok: true, id: row.id ?? input.captureId };
}
