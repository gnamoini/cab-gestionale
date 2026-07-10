import "server-only";

import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { recoverStuckImportExecutions } from "@/lib/import-core/execution-stuck-recovery.server";
import { claimQueuedExecutions } from "@/lib/import-core/import-executions.server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ProcessImportQueueResult = {
  claimed: number;
  stuckRecovered: number;
};

function createImportWorkerAdminClient(): SupabaseClient {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY assente");
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** ponytail: cron worker — stuck recovery + claim (processing via user session /executions/:id/run) */
export async function processImportQueue(input?: {
  workerId?: string;
  limit?: number;
}): Promise<ProcessImportQueueResult> {
  const sb = createImportWorkerAdminClient();
  const workerId = input?.workerId ?? `import-worker-${crypto.randomUUID().slice(0, 8)}`;
  const stuckRecovered = await recoverStuckImportExecutions(sb);
  const claimed = await claimQueuedExecutions(sb, { workerId, limit: input?.limit ?? 5 });
  return { claimed: claimed.length, stuckRecovered };
}
