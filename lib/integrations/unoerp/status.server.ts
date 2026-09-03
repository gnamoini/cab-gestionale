import "server-only";

import { createUnoerpAdminClient } from "@/lib/integrations/unoerp/admin-client.server";
import type { CabDocumentType } from "@/lib/integrations/unoerp/types";

export async function listUnoerpLinkStatuses(ids: string[], type: CabDocumentType) {
  if (ids.length === 0) return [];
  const client = createUnoerpAdminClient();
  const { data, error } = await client
    .from("unoerp_document_links")
    .select("cab_document_id, unoerp_record_id, unoerp_document_number, sync_status, last_synced_at, last_error_message")
    .in("cab_document_type", type === "preventivo" ? ["preventivo", "consuntivo"] : [type])
    .in("cab_document_id", ids.slice(0, 200));
  if (error) throw new Error(error.message);
  return data ?? [];
}
