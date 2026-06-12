import "server-only";

import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function documentBlobExists(objectPath: string): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documenti).download(normalized);
  if (error || !data) return false;
  return data.size > 0;
}
