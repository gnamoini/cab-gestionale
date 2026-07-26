import "server-only";

import { PDF_ARTIFACTS_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PdfArtifactRow } from "@/src/types/supabase-tables";

export async function fetchCurrentPdfArtifactForEntityServer(
  entityType: PdfArtifactRow["entity_type"],
  entityId: string,
): Promise<ServiceResult<PdfArtifactRow | null>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("pdf_artifacts")
    .select(PDF_ARTIFACTS_COLUMNS)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_current", true)
    .eq("status", "ready")
    .maybeSingle();
  if (error) return err(error.message);
  return success((data as PdfArtifactRow | null) ?? null);
}

export async function fetchPdfArtifactByIdServer(id: string): Promise<ServiceResult<PdfArtifactRow>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("pdf_artifacts").select(PDF_ARTIFACTS_COLUMNS).eq("id", id).maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Artifact PDF non trovato");
  return success(data as PdfArtifactRow);
}
