import "server-only";

import { DOCUMENT_ACCESS_TOKENS_COLUMNS } from "@/lib/db/table-select-columns";
import { streamOfficialDdtPdfServer, streamOfficialPreventivoPdfServer } from "@/lib/official-documents/official-pdf-stream.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DocumentAccessTokenRow } from "@/src/types/supabase-tables";

export async function streamOfficialPdfByTokenServer(
  token: string,
): Promise<ServiceResult<{ bytes: Uint8Array; fileName: string }>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_access_tokens")
    .select(DOCUMENT_ACCESS_TOKENS_COLUMNS)
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Documento non trovato");

  const row = data as DocumentAccessTokenRow;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return err("Link documento scaduto");
  }

  if (row.entity_type === "preventivo") {
    const { data: visible, error: visErr } = await sb.rpc("is_preventivo_visible_to_client", {
      p_preventivo_id: row.entity_id,
    });
    if (visErr) return err(visErr.message);
    if (!visible) return err("Documento non disponibile");
    return streamOfficialPreventivoPdfServer(row.entity_id);
  }

  const { data: ddtVisible, error: ddtErr } = await sb.rpc("is_ddt_visible_to_client", {
    p_ddt_id: row.entity_id,
  });
  if (ddtErr) return err(ddtErr.message);
  if (!ddtVisible) return err("Documento non disponibile");
  return streamOfficialDdtPdfServer(row.entity_id);
}
