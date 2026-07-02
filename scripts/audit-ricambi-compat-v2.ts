#!/usr/bin/env npx tsx
/**
 * Audit ricambi compat vs catalogo attrezzature V2.
 * Usage: npx tsx scripts/audit-ricambi-compat-v2.ts
 */
import { createClient } from "@supabase/supabase-js";
import { compatLabelsFromCatalog, fetchAttrezzatureCatalogEntries } from "@/lib/attrezzature/attrezzature-catalog";
import { parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  if (!url || !key) {
    console.log("SKIP: credenziali Supabase mancanti.");
    process.exit(0);
  }
  const sb = createClient(url, key);
  const catalog = await fetchAttrezzatureCatalogEntries(sb);
  const catalogLabels = new Set(compatLabelsFromCatalog(catalog).map((l) => l.toLowerCase()));

  const { data: ricambi } = await sb.from("magazzino_ricambi").select("id, codice, meta");
  let orphan = 0;
  for (const r of ricambi ?? []) {
    const meta = (r as { meta?: Record<string, unknown> }).meta ?? {};
    const compat = meta.compatibilita;
    if (!Array.isArray(compat)) continue;
    for (const line of compat) {
      if (typeof line !== "string") continue;
      const label = line.trim();
      if (!label || catalogLabels.has(label.toLowerCase())) continue;
      const { marca, modello } = parseCompatMarcaModello(label);
      if (!marca && !modello) continue;
      orphan += 1;
      console.log(`ORPHAN ${(r as { codice?: string }).codice ?? r.id}: ${label}`);
    }
  }
  console.log(`\n=== Ricambi compat orphan vs fleet: ${orphan} linee ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
