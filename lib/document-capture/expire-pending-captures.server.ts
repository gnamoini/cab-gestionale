import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function expirePendingDocumentCaptures(): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("expire_pending_document_captures");
  if (error) {
    throw new Error(error.message);
  }
  return typeof data === "number" ? data : 0;
}
