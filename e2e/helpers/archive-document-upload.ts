import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import type { StorageBucketId } from "@/src/lib/storage/storage-config";

/** E2E smoke only: carica bytes su path policy. Analyze/finalize restano su user JWT. */
export async function uploadArchiveSmokeBytes(input: {
  bucket: StorageBucketId;
  path: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY assente" };
  }
  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.storage.from(input.bucket).upload(input.path, input.bytes, {
    upsert: false,
    contentType: input.contentType,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
