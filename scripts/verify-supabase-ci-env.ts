/**
 * Verifica connettività Supabase con env corrente (CI diagnostics).
 */
import { fetchProductionReadinessDbSnapshot } from "@/lib/production/fetch-production-readiness-db";

async function main(): Promise<void> {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`[verify-supabase-ci] missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(
    `[verify-supabase-ci] lens url=${process.env.NEXT_PUBLIC_SUPABASE_URL?.length ?? 0} anon=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0} service=${process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0}`,
  );

  const snap = await fetchProductionReadinessDbSnapshot();
  if (!snap.connected) {
    console.error("[verify-supabase-ci] DB snapshot not connected");
    process.exit(1);
  }
  console.log("[verify-supabase-ci] DB snapshot connected");
}

void main().catch((err) => {
  console.error("[verify-supabase-ci]", err instanceof Error ? err.message : err);
  process.exit(1);
});
