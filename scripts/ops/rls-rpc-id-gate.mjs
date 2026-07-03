#!/usr/bin/env node
/**
 * Observational RLS ID-gate — CI-only regression detector (NOT security enforcement).
 * Usage: node scripts/ops/rls-rpc-id-gate.mjs --snapshot=test-fixtures/rls-parity-snapshot.v1.json
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const snapshotArg = args.find((a) => a.startsWith("--snapshot="));
const snapshotPath = snapshotArg
  ? snapshotArg.split("=")[1]
  : "test-fixtures/rls-parity-snapshot.v1.json";

const abs = path.resolve(process.cwd(), snapshotPath);
if (!fs.existsSync(abs)) {
  console.error(`[rls-rpc-id-gate] snapshot missing: ${abs}`);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(abs, "utf8"));
console.log("[rls-rpc-id-gate] snapshot loaded:", {
  filters: snapshot.filters,
  order_by: snapshot.order_by,
});

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[rls-rpc-id-gate] skip — SUPABASE_URL and key required for live compare");
  process.exit(0);
}

async function rpcIds(): Promise<Set<string>> {
  const res = await fetch(`${url}/rest/v1/rpc/list_lavorazioni_paginated`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_mode: snapshot.filters?.mode ?? "active",
      p_limit: snapshot.filters?.limit ?? 50,
      p_cursor_created_at: snapshot.cursor?.created_at ?? null,
      p_cursor_id: snapshot.cursor?.id ?? null,
      p_search: null,
      p_stato: null,
    }),
  });
  if (!res.ok) {
    throw new Error(`RPC failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  return new Set(rows.map((r: { id: string }) => r.id).filter(Boolean));
}

try {
  const ids = await rpcIds();
  console.log(`[rls-rpc-id-gate] RPC returned ${ids.size} ids (observational only)`);
  process.exit(0);
} catch (e) {
  console.error("[rls-rpc-id-gate] error:", e instanceof Error ? e.message : e);
  process.exit(1);
}
