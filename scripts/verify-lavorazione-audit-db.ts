/**
 * Verifica post-E2E: confronta campi Scheda Ingresso attesi vs DB Supabase.
 * Uso: npx tsx scripts/verify-lavorazione-audit-db.ts --token AUDIT-20260608-120000
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  buildSchedaIngressoAuditFixture,
  SCHEDA_INGRESSO_DB_KEYS,
  type SchedaIngressoAuditFixture,
} from "../e2e/fixtures/scheda-ingresso-test-data";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

const ROOT = process.cwd();

function loadEnvLocal(): void {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(): { token: string; edit: boolean } {
  const args = process.argv.slice(2);
  let token = "";
  let edit = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--token" && args[i + 1]) token = args[++i]!;
    if (args[i] === "--edit") edit = true;
  }
  if (!token) {
    console.error("Uso: npx tsx scripts/verify-lavorazione-audit-db.ts --token AUDIT-...");
    process.exit(1);
  }
  return { token, edit };
}

type RowResult = { field: string; expected: string; actual: string; ok: boolean };

function campiFromContenuto(contenuto: unknown): Record<string, string> | null {
  if (!contenuto || typeof contenuto !== "object") return null;
  const doc = (contenuto as { doc?: { campi?: Record<string, unknown> } }).doc;
  if (!doc?.campi || typeof doc.campi !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(doc.campi)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

function compareCampi(
  expected: Record<string, string | null | undefined>,
  actual: Record<string, string> | null,
  keys: readonly string[],
): RowResult[] {
  return keys.map((field) => {
    const exp = String(expected[field] ?? "");
    const act = actual?.[field] ?? "";
    return { field, expected: exp, actual: act, ok: exp === act };
  });
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { token, edit } = parseArgs();
  const fixture: SchedaIngressoAuditFixture = buildSchedaIngressoAuditFixture(token);
  const expectedIngresso = edit
    ? { ...fixture.ingresso, ...fixture.ingressoEdit }
    : fixture.ingresso;

  const { url } = assertSupabasePublicEnv();
  const serviceKey = assertSupabaseServiceRoleKey();
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: lavRows, error: lavErr } = await admin
    .from("lavorazioni")
    .select("id, codice, note, data_ingresso, stato, priorita")
    .or(`note.ilike.%${token}%,codice.ilike.%${token}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (lavErr) {
    console.error("Errore lettura lavorazioni:", lavErr.message);
    process.exit(1);
  }

  const { data: schedaByCliente } = await admin
    .from("scheda_lavorazione")
    .select("id, lavorazione_id, tipo, contenuto, updated_at")
    .eq("tipo", "ingresso")
    .order("updated_at", { ascending: false })
    .limit(50);

  const ingressoScheda = (schedaByCliente ?? []).find((row) => {
    const campi = campiFromContenuto(row.contenuto);
    return campi?.cliente?.includes(token);
  });

  let lav = lavRows?.find((r) => (r.note ?? "").includes(token));
  if (!lav && ingressoScheda) {
    const { data: lavById } = await admin
      .from("lavorazioni")
      .select("id, codice, note, data_ingresso, stato, priorita")
      .eq("id", ingressoScheda.lavorazione_id)
      .maybeSingle();
    lav = lavById ?? undefined;
  }

  if (!lav) {
    console.error(`Nessuna lavorazione trovata per token ${token}`);
    process.exit(1);
  }

  const campi = ingressoScheda ? campiFromContenuto(ingressoScheda.contenuto) : null;
  const rows = compareCampi(expectedIngresso, campi, SCHEDA_INGRESSO_DB_KEYS);

  const noteOk = (lav.note ?? "") === (expectedIngresso.noteIntervento ?? "");
  rows.push({
    field: "lavorazioni.note (sync)",
    expected: expectedIngresso.noteIntervento,
    actual: lav.note ?? "",
    ok: noteOk,
  });

  console.log(`\nVERIFY lavorazione audit — token ${token}`);
  console.log(`lavorazione_id: ${lav.id}`);
  console.log(`scheda_ingresso_id: ${ingressoScheda?.id ?? "(non trovata)"}\n`);
  console.log("field | expected | actual | OK");
  console.log("------|----------|--------|----");
  for (const r of rows) {
    const mark = r.ok ? "OK" : "FAIL";
    const exp = r.expected.length > 40 ? `${r.expected.slice(0, 37)}...` : r.expected;
    const act = r.actual.length > 40 ? `${r.actual.slice(0, 37)}...` : r.actual;
    console.log(`${r.field} | ${exp} | ${act} | ${mark}`);
  }

  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} campo/i non corrispondono.`);
    process.exit(1);
  }
  console.log("\nTutti i campi verificati: OK");
}

void main();
