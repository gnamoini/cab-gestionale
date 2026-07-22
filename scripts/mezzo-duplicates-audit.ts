/**
 * Audit duplicati mezzo per identificativo (report only, no auto-merge).
 * Uso: npx tsx scripts/mezzo-duplicates-audit.ts [--out report.json]
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

export type DuplicateCategory = "merge_candidate" | "manual_review" | "missing_ident";

export type DuplicateGroup = {
  category: DuplicateCategory;
  identKey: string;
  mezzoIds: string[];
  clienti: string[];
  lavorazioniCount: number;
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function buildIdentKey(targa: string, matricola: string, scuderia: string): string | null {
  const parts = [norm(targa), norm(matricola), norm(scuderia)].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join("|");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log("SKIP: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurati.");
    process.exit(0);
  }

  const sb = createClient(url, key);
  const { data: mezzi, error } = await sb
    .from("mezzi")
    .select("id, cliente, targa, numero_scuderia, attrezzature(matricola)")
    .is("deleted_at", null);
  if (error) throw error;

  const buckets = new Map<string, { mezzoIds: string[]; clienti: Set<string> }>();
  for (const m of mezzi ?? []) {
    const att = (m.attrezzature as { matricola?: string | null }[] | null)?.[0]?.matricola ?? "";
    const key = buildIdentKey(m.targa ?? "", att, m.numero_scuderia ?? "");
    if (!key) continue;
    const hit = buckets.get(key) ?? { mezzoIds: [], clienti: new Set<string>() };
    hit.mezzoIds.push(m.id);
    if (m.cliente?.trim()) hit.clienti.add(m.cliente.trim());
    buckets.set(key, hit);
  }

  const groups: DuplicateGroup[] = [];
  for (const [identKey, bucket] of buckets) {
    if (bucket.mezzoIds.length < 2) continue;
    const clienti = [...bucket.clienti];
    let category: DuplicateCategory = "merge_candidate";
    if (clienti.length > 1) category = "manual_review";

    const { count } = await sb
      .from("lavorazioni")
      .select("id", { count: "exact", head: true })
      .in("mezzo_id", bucket.mezzoIds);
    groups.push({
      category,
      identKey,
      mezzoIds: bucket.mezzoIds,
      clienti,
      lavorazioniCount: count ?? 0,
    });
  }

  const outPath = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1] ?? "mezzo-duplicates-audit-report.json"
    : "mezzo-duplicates-audit-report.json";

  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), groups }, null, 2));
  console.log(`Wrote ${outPath} (${groups.length} duplicate groups)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
