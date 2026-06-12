import "server-only";

import { BUNDER_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { bunderRowToDocument } from "@/lib/bunder/bunder-db-mapper";
import type { BunderCommercialDocument } from "@/lib/bunder/types";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { BunderDocumentRow } from "@/src/types/supabase-tables";

export async function fetchBunderDocumentServer(id: string): Promise<ServiceResult<BunderCommercialDocument>> {
  const allowed = await verifyServerSectionRead("bunder");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("bunder_documents").select(BUNDER_DOCUMENTS_COLUMNS).eq("id", id).maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Documento non trovato");
  return success(bunderRowToDocument(data as BunderDocumentRow));
}
