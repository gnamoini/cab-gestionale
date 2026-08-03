import "server-only";

import { DOCUMENT_ACCESS_TOKENS_COLUMNS, PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";
import { buildClientOfficialDocumentPreviewPath, buildOfficialDocumentTokenStreamPath } from "@/lib/official-documents/preview-url";
import type { ClientLavorazioneDocumentsPayload } from "@/lib/official-documents/types";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DdtDocumentRow, DocumentAccessTokenRow, PreventivoRow } from "@/src/types/supabase-tables";

const DDT_COLUMNS =
  "id, numero, status, data_documento, cliente_label, preventivo_id, lavorazione_id, current_pdf_artifact_id" as const;

export async function resolveClientDocumentsForLavorazioneServer(
  lavorazioneId: string,
): Promise<ServiceResult<ClientLavorazioneDocumentsPayload>> {
  const sb = await createSupabaseServerUserClient();

  const [{ data: preventiviRows, error: pErr }, { data: tokenRows, error: tErr }, { data: ddtRows, error: dErr }] =
    await Promise.all([
      sb.from("preventivi").select(PREVENTIVI_COLUMNS).eq("lavorazione_id", lavorazioneId),
      sb
        .from("document_access_tokens")
        .select(DOCUMENT_ACCESS_TOKENS_COLUMNS)
        .eq("lavorazione_id", lavorazioneId)
        .is("revoked_at", null),
      sb.from("ddt_documents").select(DDT_COLUMNS).eq("lavorazione_id", lavorazioneId).neq("status", "annullato"),
    ]);

  if (pErr) return err(pErr.message);
  if (tErr) return err(tErr.message);
  if (dErr) return err(dErr.message);

  const tokens = (tokenRows ?? []) as DocumentAccessTokenRow[];
  const tokenByEntity = new Map(tokens.map((t) => [`${t.entity_type}:${t.entity_id}`, t]));

  const preventivi = (preventiviRows ?? [])
    .map((row) => row as PreventivoRow)
    .filter((r) => isPreventivoVisibleToClient(r.stato))
    .map((r) => {
      const token = tokenByEntity.get(`preventivo:${r.id}`);
      const numero = (r.dettagli as { numero?: string })?.numero?.trim();
      return {
        kind: "preventivo" as const,
        label: numero ? `Preventivo ${numero}` : "Preventivo",
        previewPath: token ? buildClientOfficialDocumentPreviewPath(token.token) : "",
        streamPath: token ? buildOfficialDocumentTokenStreamPath(token.token) : "",
        stato: r.stato,
      };
    })
    .filter((p) => p.streamPath);

  const visiblePreventivoIds = new Set(
    (preventiviRows ?? [])
      .map((r) => r as PreventivoRow)
      .filter((r) => isPreventivoVisibleToClient(r.stato))
      .map((r) => r.id),
  );

  const ddt = (ddtRows ?? [])
    .map((row) => row as DdtDocumentRow)
    .filter((d) => d.preventivo_id && visiblePreventivoIds.has(d.preventivo_id))
    .map((d) => {
      const token = tokenByEntity.get(`ddt:${d.id}`);
      return {
        kind: "ddt" as const,
        label: d.numero != null ? `DDT ${d.numero}` : "DDT",
        previewPath: token ? buildClientOfficialDocumentPreviewPath(token.token) : "",
        streamPath: token ? buildOfficialDocumentTokenStreamPath(token.token) : "",
      };
    })
    .filter((d) => d.streamPath);

  return success({ preventivi, ddt });
}
