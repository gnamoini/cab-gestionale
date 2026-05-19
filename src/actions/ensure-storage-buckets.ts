"use server";

import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { STORAGE_BUCKETS, STORAGE_LIMITS, type StorageBucketId } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { formatSupabaseError } from "@/src/utils/supabaseErrorHandler";

export type EnsureStorageBucketsResult = { ok: true } | { ok: false; message: string };

const BUCKET_OPTIONS: Record<
  StorageBucketId,
  { public: boolean; fileSizeLimit: number; allowedMimeTypes?: string[] }
> = {
  [STORAGE_BUCKETS.images]: {
    public: false,
    fileSizeLimit: STORAGE_LIMITS.imagesMaxBytes,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/jpg"],
  },
  [STORAGE_BUCKETS.documenti]: {
    public: true,
    fileSizeLimit: STORAGE_LIMITS.documentiMaxBytes,
  },
};

function isAlreadyExistsError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("already exists") || m.includes("duplicate") || m.includes("resource already exists");
}

/**
 * Crea i bucket mancanti via service role (solo server).
 * Richiede sessione autenticata; le policy RLS restano definite dalle migration SQL.
 */
export async function ensureStorageBucketsAction(
  buckets?: StorageBucketId[],
): Promise<EnsureStorageBucketsResult> {
  const sbUser = await createSupabaseServerUserClient();
  const {
    data: { user },
    error: userErr,
  } = await sbUser.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  const canProvision = await verifyServerPermission("manageSettings");
  if (!canProvision) {
    return { ok: false, message: "Operazione riservata agli amministratori." };
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return {
      ok: false,
      message: "Provisioning storage non configurato sul server (manca SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const targets = buckets?.length ? buckets : (Object.values(STORAGE_BUCKETS) as StorageBucketId[]);

  try {
    for (const bucketId of targets) {
      const opts = BUCKET_OPTIONS[bucketId];
      const { error } = await admin.storage.createBucket(bucketId, {
        public: opts.public,
        fileSizeLimit: opts.fileSizeLimit,
        allowedMimeTypes: opts.allowedMimeTypes,
      });
      if (error && !isAlreadyExistsError(error.message)) {
        return { ok: false, message: formatSupabaseError(error) };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: formatSupabaseError(e) };
  }
}
