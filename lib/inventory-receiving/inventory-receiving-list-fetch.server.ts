import "server-only";

import { INVENTORY_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { InventoryDocumentRow } from "@/src/types/supabase-tables";

/** SSOT lista documenti receiving ÔÇö riusato da API e prefetch pagina carichi. */
export async function fetchInventoryReceivingDocumentsServer(): Promise<
  ServiceResult<InventoryDocumentRow[]>
> {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return err("Permesso negato.");
  }

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return err(error.message);
  }

  return success((data ?? []) as InventoryDocumentRow[]);
}
