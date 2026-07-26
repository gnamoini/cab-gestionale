import "server-only";

import { PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";
import { buildStaffOfficialDocumentPreviewPath } from "@/lib/official-documents/preview-url";
import type { StaffLavorazioneDocumentsPayload } from "@/lib/official-documents/types";
import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DdtDocumentRow, PreventivoRow } from "@/src/types/supabase-tables";

const DDT_COLUMNS =
  "id, numero, status, data_documento, cliente_label, preventivo_id, lavorazione_id, current_pdf_artifact_id" as const;

export async function resolveStaffDocumentsForLavorazioneServer(
  lavorazioneId: string,
): Promise<ServiceResult<StaffLavorazioneDocumentsPayload>> {
  const sb = await createSupabaseServerUserClient();
  const { data: preventiviRows, error: pErr } = await sb
    .from("preventivi")
    .select(PREVENTIVI_COLUMNS)
    .eq("lavorazione_id", lavorazioneId)
    .order("created_at", { ascending: false });
  if (pErr) return err(pErr.message);

  const { data: ddtRows, error: dErr } = await sb
    .from("ddt_documents")
    .select(DDT_COLUMNS)
    .eq("lavorazione_id", lavorazioneId)
    .neq("status", "annullato")
    .order("created_at", { ascending: false });
  if (dErr) return err(dErr.message);

  const preventivi = (preventiviRows ?? []).map((row) => {
    const r = row as PreventivoRow;
    const record = preventivoRowToRecord(r, null);
    return {
      kind: "preventivo" as const,
      id: r.id,
      numero: record.numero,
      stato: record.stato,
      cliente: record.cliente,
      dataCreazione: record.dataCreazione,
      totale: record.totaleFinale,
      previewPath: buildStaffOfficialDocumentPreviewPath("preventivo", r.id),
      hasPdf: Boolean(r.current_pdf_artifact_id),
    };
  });

  const ddt = (ddtRows ?? []).map((row) => {
    const r = row as DdtDocumentRow;
    return {
      kind: "ddt" as const,
      id: r.id,
      numero: r.numero != null ? String(r.numero) : null,
      status: r.status,
      clienteLabel: r.cliente_label,
      dataDocumento: r.data_documento,
      previewPath: buildStaffOfficialDocumentPreviewPath("ddt", r.id),
      hasPdf: Boolean(r.current_pdf_artifact_id),
    };
  });

  return success({ preventivi, ddt });
}
