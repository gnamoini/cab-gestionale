/**
 * Diagnostica fetch lista lavorazioni (locale).
 * Uso: npx tsx scripts/debug-lavorazioni-list-fetch.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): Record<string, string> {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "?";
console.log("=== Debug lavorazioni list fetch ===");
console.log("projectRef:", projectRef);

const admin = serviceKey ? createClient(url, serviceKey) : null;

async function adminCount(label: string, filters: { archived?: boolean } = {}) {
  if (!admin) {
    console.log(`[admin] ${label}: SKIP (no service role)`);
    return;
  }
  let q = admin.from("lavorazioni").select("id", { count: "exact", head: true }).is("deleted_at", null);
  if (filters.archived === false) q = q.eq("archived", false);
  if (filters.archived === true) q = q.eq("archived", true);
  const { count, error } = await q;
  console.log(`[admin] ${label}: count=${count ?? "?"} error=${error?.message ?? "none"}`);
}

async function testSelect(
  client: SupabaseClient,
  label: string,
  select: string,
) {
  const { data, error } = await client
    .from("lavorazioni")
    .select(select)
    .is("deleted_at", null)
    .eq("archived", false)
    .limit(3);
  console.log(`[${label}] select=${select.slice(0, 60)}...`);
  if (error) {
    console.log(`  ERROR: ${error.message}`);
    if (error.code) console.log(`  code: ${error.code}`);
    if (error.details) console.log(`  details: ${error.details}`);
    if (error.hint) console.log(`  hint: ${error.hint}`);
  } else {
    console.log(`  OK rows=${data?.length ?? 0}`);
  }
}

async function checkColumns() {
  if (!admin) return;
  const { data, error } = await admin.rpc("pg_catalog_not_exists" as never).select();
  void data;
  void error;
  // information_schema via raw SQL not available on client; probe via minimal selects
  for (const col of ["updated_by", "deleted_at", "archived"]) {
    const { error: colErr } = await admin.from("lavorazioni").select(col).limit(1);
    console.log(`[schema] column ${col}: ${colErr ? `MISSING/ERR ${colErr.message}` : "OK"}`);
  }
}

async function main() {
  await checkColumns();
  await adminCount("total active (deleted_at null)", {});
  await adminCount("in corso (archived=false)", { archived: false });
  await adminCount("archivio (archived=true)", { archived: true });

  const anon = createClient(url, anonKey);
  await testSelect(anon, "anon-minimal", "id,archived,deleted_at");
  await testSelect(anon, "anon-mezzi", "id, mezzi(*)");
  await testSelect(
    anon,
    "anon-profiles-join",
    "id, updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome), created_by_profile:profiles!lavorazioni_created_by_fkey(nome)",
  );
  await testSelect(
    anon,
    "anon-full",
    "*, updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome), created_by_profile:profiles!lavorazioni_created_by_fkey(nome), mezzi(*)",
  );

  if (admin) {
    await testSelect(
      admin,
      "admin-full-join",
      "*, updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome), created_by_profile:profiles!lavorazioni_created_by_fkey(nome), mezzi(*)",
    );
  }
}

void main();
