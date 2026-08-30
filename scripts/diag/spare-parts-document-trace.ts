#!/usr/bin/env npx tsx
/**
 * Traccia stato indicizzazione Ricambi AI per documento_id.
 * Uso: npx tsx scripts/diag/spare-parts-document-trace.ts <documento_id>
 */
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

const documentoId = process.argv[2];
if (!documentoId) {
  console.error("Usage: npx tsx scripts/diag/spare-parts-document-trace.ts <documento_id>");
  process.exit(1);
}

const serviceKey = readSupabaseServiceRoleKey();
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY mancante");
  process.exit(1);
}

const { url } = assertSupabasePublicEnv();
const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: doc } = await sb
  .from("documenti")
  .select("id, categoria, marca, meta")
  .eq("id", documentoId)
  .maybeSingle();

const { data: index } = await sb
  .from("document_ai_index")
  .select("*")
  .eq("documento_id", documentoId)
  .eq("is_active", true)
  .maybeSingle();

let partCount = 0;
let pageCount = 0;
if (index?.id) {
  const { count: pc } = await sb
    .from("document_ai_part_references")
    .select("id", { count: "exact", head: true })
    .eq("index_id", index.id);
  partCount = pc ?? 0;
  const { count: pg } = await sb
    .from("document_ai_pages")
    .select("id", { count: "exact", head: true })
    .eq("index_id", index.id);
  pageCount = pg ?? 0;
}

console.log(
  JSON.stringify(
    {
      documento: doc,
      index,
      counts: { parts: partCount, pages: pageCount },
    },
    null,
    2,
  ),
);
