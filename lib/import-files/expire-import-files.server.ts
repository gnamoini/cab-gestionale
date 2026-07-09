import "server-only";

import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { createClient } from "@supabase/supabase-js";

export async function expireImportFiles(): Promise<number> {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY assente");
  }
  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc("expire_import_files");
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}
