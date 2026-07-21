#!/usr/bin/env npx tsx
/**
 * Benchmark listTagliandiOverview — target <300ms per 500 mezzi × 5 config (staging).
 * Richiede SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("bench-maintenance-engine: skip — missing SUPABASE_URL / SERVICE_ROLE_KEY");
  process.exit(0);
}

const client = createClient(url, key, { auth: { persistSession: false } });

async function bench(): Promise<void> {
  const t0 = performance.now();
  const { data: configs, error } = await client
    .from("vehicle_maintenance_configs")
    .select("id, mezzo_id, preset_id, interval_type, interval_value, label, maintenance_kind, is_active")
    .eq("is_active", true)
    .is("deleted_at", null);
  const t1 = performance.now();

  if (error) {
    console.error("bench failed:", error.message);
    process.exit(1);
  }

  const mezzoCount = new Set((configs ?? []).map((c) => c.mezzo_id)).size;
  const elapsed = Math.round(t1 - t0);

  console.log(
    JSON.stringify({
      configs: configs?.length ?? 0,
      mezzi: mezzoCount,
      queryMs: elapsed,
      targetMs: 300,
      ok: elapsed < 300,
    }),
  );
}

void bench();
