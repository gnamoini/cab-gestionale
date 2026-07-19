/**
 * Smoke post-deploy: verifica pipeline audit log_modifiche.
 * Uso: npx tsx scripts/verify-audit-log-pipeline.ts
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { LOG_MODIFICHE_WITH_PROFILE_SELECT } from "@/lib/db/table-select-columns";

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

type StepResult = { step: string; ok: boolean; detail: string };

async function main(): Promise<void> {
  loadEnvLocal();
  const { url } = assertSupabasePublicEnv();
  const serviceKey = assertSupabaseServiceRoleKey();
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const results: StepResult[] = [];

  // 1. Table exists + recent rows
  const { count, error: countErr } = await admin
    .from("log_modifiche")
    .select("id", { count: "exact", head: true });
  results.push({
    step: "table_exists",
    ok: !countErr,
    detail: countErr ? countErr.message : `count=${count ?? 0}`,
  });

  const { data: latest, error: latestErr } = await admin
    .from("log_modifiche")
    .select("id, entita, azione, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  results.push({
    step: "latest_row",
    ok: !latestErr && latest != null,
    detail: latestErr
      ? latestErr.message
      : latest
        ? `${latest.entita}/${latest.azione} @ ${latest.created_at}`
        : "nessuna riga",
  });

  // 2. Read smoke (table accessible)
  const { data: readSmoke, error: readErr } = await admin.from("log_modifiche").select("id").limit(1);
  results.push({
    step: "read_smoke",
    ok: !readErr && Array.isArray(readSmoke),
    detail: readErr ? readErr.message : `rows=${readSmoke?.length ?? 0}`,
  });

  // 3. Per-entity counts (drawer domains)
  const entities = ["lavorazioni", "mezzi", "magazzino_ricambi", "movimenti_ricambi", "preventivi", "documenti", "invoices"];
  for (const entita of entities) {
    const { count: ec, error: ee } = await admin
      .from("log_modifiche")
      .select("id", { count: "exact", head: true })
      .eq("entita", entita);
    results.push({
      step: `entity_${entita}`,
      ok: !ee,
      detail: ee ? ee.message : `count=${ec ?? 0}`,
    });
  }

  // 4. Profile embed (drawer query shape)
  const { data: embedSample, error: embedErr } = await admin
    .from("log_modifiche")
    .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
    .order("created_at", { ascending: false })
    .limit(3);
  results.push({
    step: "profile_embed_select",
    ok: !embedErr && (embedSample?.length ?? 0) > 0,
    detail: embedErr ? embedErr.message : `rows=${embedSample?.length ?? 0}`,
  });

  // 5. Test INSERT + DELETE (round-trip)
  const testEntita = "lavorazioni";
  const testEntitaId = "00000000-0000-4000-8000-000000000099";
  const testAutore = latest?.id ? (await admin.from("log_modifiche").select("autore_id").limit(1).single()).data?.autore_id : null;

  if (testAutore) {
    const { data: inserted, error: insErr } = await admin
      .from("log_modifiche")
      .insert({
        entita: testEntita,
        entita_id: testEntitaId,
        azione: "UPDATE",
        autore_id: testAutore,
        payload: { _verify: "audit-log-pipeline", summary: "VERIFY_PIPELINE_TEST" },
      })
      .select("id")
      .single();

    results.push({
      step: "insert_roundtrip",
      ok: !insErr && inserted?.id != null,
      detail: insErr ? insErr.message : `id=${inserted?.id}`,
    });

    if (inserted?.id) {
      const { error: delErr } = await admin.from("log_modifiche").delete().eq("id", inserted.id);
      results.push({
        step: "cleanup_test_row",
        ok: !delErr,
        detail: delErr ? delErr.message : "deleted",
      });
    }
  } else {
    results.push({ step: "insert_roundtrip", ok: false, detail: "autore_id non disponibile" });
  }

  console.log("\n=== VERIFY audit-log pipeline ===\n");
  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    if (!r.ok) failed += 1;
    console.log(`${mark}  ${r.step}: ${r.detail}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed\n`);

  if (failed > 0) process.exit(1);
}

void main();
