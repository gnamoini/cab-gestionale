import "server-only";

import { cache } from "react";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function downloadDocumentoBytes(objectPath: string): Promise<Uint8Array | null> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documenti).download(normalized);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export const getCachedDocumentoBytes = cache(async (objectPath: string) => {
  return downloadDocumentoBytes(objectPath);
});
