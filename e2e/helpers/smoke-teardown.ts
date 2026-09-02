import { createClient } from "@supabase/supabase-js";
import { cleanupSmokeData } from "@/lib/smoke/cleanup-smoke-data";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

import { evaluateSmokeMutationGate } from "@/lib/smoke/smoke-target-policy";

/** Best-effort teardown dati smoke dopo spec mutanti (spec 05/13/14). */
export async function applySmokeTeardown(options?: { verbose?: boolean }): Promise<void> {
  if (process.env.SMOKE_SKIP_TEARDOWN === "1") return;

  const gate = evaluateSmokeMutationGate();
  if (!gate.allowed && gate.reason.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    console.warn("[smoke-teardown] SKIP: service role assente — dati AUDIT-* potrebbero restare nel DB");
    return;
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) return;

  try {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const report = await cleanupSmokeData(admin, { apply: true, verbose: options?.verbose });
    if (report.errors.length > 0) {
      console.warn("[smoke-teardown]", report.errors.join("; "));
    }
  } catch (e) {
    console.warn("[smoke-teardown]", e instanceof Error ? e.message : String(e));
  }
}
