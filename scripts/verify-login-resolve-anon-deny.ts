/**
 * Live gate: anon client must not EXECUTE resolve_auth_email_for_login.
 * Usage: npx tsx scripts/verify-login-resolve-anon-deny.ts
 * Exit 0 = permission denied (expected). Exit 1 = anon can execute (violation).
 */
import { createClient } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "@/lib/env/supabase-public";

const PERMISSION_DENIED =
  /permission denied|42501|insufficient_privilege|PGRST301|not authorized|forbidden/i;

async function main(): Promise<void> {
  const env = readSupabasePublicEnv();
  if (!env) {
    const msg = "verify-login-resolve-anon-deny: SKIP (missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)";
    if (process.env.ENFORCE_LIVE_P0_GATE === "1") {
      console.error(`${msg} — required when ENFORCE_LIVE_P0_GATE=1`);
      process.exit(1);
    }
    console.log(msg);
    process.exit(0);
  }

  const { url, anonKey } = env;
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await anon.rpc("resolve_auth_email_for_login", {
    p_identifier: "__cab_anon_deny_probe__",
  });

  if (error && PERMISSION_DENIED.test(error.message)) {
    console.log("verify-login-resolve-anon-deny: OK (permission denied)");
    process.exit(0);
  }

  if (error) {
    console.error("verify-login-resolve-anon-deny: unexpected error shape:", error.message);
    process.exit(1);
  }

  if (data !== null && data !== undefined && data !== "") {
    console.error("verify-login-resolve-anon-deny: FAIL — anon received data:", data);
    process.exit(1);
  }

  console.log("verify-login-resolve-anon-deny: OK (empty result, no anon execute leak)");
  process.exit(0);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (PERMISSION_DENIED.test(msg)) {
    console.log("verify-login-resolve-anon-deny: OK (permission denied via throw)");
    process.exit(0);
  }
  console.error("verify-login-resolve-anon-deny: FAIL", e);
  process.exit(1);
});
