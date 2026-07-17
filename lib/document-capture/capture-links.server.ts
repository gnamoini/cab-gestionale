import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type CaptureLinkEntityType =
  | "lavorazione"
  | "scheda_lavorazione"
  | "mezzo"
  | "ricambio_movimento"
  | "attrezzatura"
  | "duplicate_capture";

export type CaptureLinkRelation = "created_from" | "attached_to" | "duplicate_of";

export async function insertCaptureLinks(
  links: Array<{
    captureId: string;
    companyId: string;
    entityType: CaptureLinkEntityType;
    entityId: string;
    relation: CaptureLinkRelation;
    createdBy: string;
  }>,
): Promise<void> {
  if (links.length === 0) return;
  const sb = await createSupabaseServerUserClient();
  const rows = links.map((l) => ({
    capture_id: l.captureId,
    company_id: l.companyId,
    entity_type: l.entityType,
    entity_id: l.entityId,
    relation: l.relation,
    created_by: l.createdBy,
  }));
  const { error } = await sb
    .from("document_capture_links")
    .upsert(rows, { onConflict: "capture_id,entity_type,entity_id,relation", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function fetchCaptureLinksForCapture(captureId: string) {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture_links")
    .select("*")
    .eq("capture_id", captureId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
