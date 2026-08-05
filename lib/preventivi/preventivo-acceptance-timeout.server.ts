import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function runPreventivoAcceptanceTimeoutBatch(limit = 50): Promise<{
  ok: boolean;
  processed?: number;
  error?: string;
}> {
  try {
    const client = createAdminClient();
    const { data, error } = await client.rpc("process_preventivo_acceptance_timeouts", {
      p_limit: limit,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, processed: typeof data === "number" ? data : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore timeout preventivi" };
  }
}
