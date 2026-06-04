/**
 * Bonifica documenti.url_file: sostituisce URL http(s) legacy con path storage estratto.
 * Richiede SUPABASE_SERVICE_ROLE_KEY e variabili pubbliche Supabase.
 *
 * Dry-run (default): npm run documenti:remediate-url-file
 * Applica: DOCUMENTI_REMEDIATE_APPLY=1 npm run documenti:remediate-url-file
 */
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "../lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "../lib/env/supabase-service-role";
import {
  classifyDocumentoUrlRow,
  type DocumentoUrlRow,
} from "../lib/ops/documenti-url-inventory";
import { normalizeStorageObjectPath } from "../src/lib/storage/storage-paths";

const APPLY = process.env.DOCUMENTI_REMEDIATE_APPLY === "1";

async function main(): Promise<void> {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY mancante.");
    process.exit(1);
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.from("documenti").select("id, url_file").limit(5000);
  if (error) {
    console.error("Lettura documenti fallita:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as DocumentoUrlRow[];
  const toFix = rows
    .map(classifyDocumentoUrlRow)
    .filter((c) => c.legacyResolvable && c.storagePath);

  console.log(`Righe legacy bonificabili: ${toFix.length} / ${rows.length} (apply=${APPLY})`);

  let updated = 0;
  let failed = 0;

  for (const item of toFix) {
    const path = normalizeStorageObjectPath(item.storagePath!);
    if (!APPLY) {
      console.log(`[dry-run] ${item.id}: ${item.url_file.slice(0, 80)}… → ${path}`);
      updated += 1;
      continue;
    }

    const { error: upErr } = await admin.from("documenti").update({ url_file: path }).eq("id", item.id);
    if (upErr) {
      console.error(`FAIL ${item.id}:`, upErr.message);
      failed += 1;
    } else {
      console.log(`OK ${item.id} → ${path}`);
      updated += 1;
    }
  }

  console.log(`Completato: ${updated} aggiornati, ${failed} errori.`);
  if (!APPLY && toFix.length > 0) {
    console.log("Per applicare: DOCUMENTI_REMEDIATE_APPLY=1 npm run documenti:remediate-url-file");
  }
}

void main();
