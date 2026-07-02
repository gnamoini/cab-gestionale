/**
 * Baseline audit pre/post migrazione V2 SSOT.
 * Usage: npx tsx scripts/audit-mezzo-v2-baseline.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  if (!url || !key) {
    console.log("SKIP: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurati.");
    console.log("Eseguire con credenziali Supabase per conteggi orphan.");
    process.exit(0);
  }
  const sb = createClient(url, key);
  let mezziNoAttData: unknown = null;
  try {
    const rpcRes = await sb.rpc("count_mezzi_without_attrezzatura" as never);
    mezziNoAttData = rpcRes.data;
  } catch {
    mezziNoAttData = null;
  }
  const [mezzi, attrezzature, lavNoTarget] = await Promise.all([
    sb.from("mezzi").select("id", { count: "exact", head: true }),
    sb.from("attrezzature").select("id", { count: "exact", head: true }),
    sb.from("lavorazioni").select("id", { count: "exact", head: true }).is("target_type", null),
  ]);

  console.log("=== Mezzo V2 baseline ===");
  console.log(`mezzi total: ${mezzi.count ?? "?"}`);
  console.log(`attrezzature total: ${attrezzature.count ?? "?"}`);
  console.log(`lavorazioni senza target_type: ${lavNoTarget.count ?? "?"}`);

  if (mezziNoAttData == null) {
    const { data: allMezzi } = await sb.from("mezzi").select("id");
    const { data: allAtt } = await sb.from("attrezzature").select("mezzo_id");
    const withAtt = new Set((allAtt ?? []).map((a) => (a as { mezzo_id: string }).mezzo_id));
    const orphan = (allMezzi ?? []).filter((m) => !withAtt.has((m as { id: string }).id)).length;
    console.log(`mezzi senza attrezzatura: ${orphan}`);
  } else {
    console.log(`mezzi senza attrezzatura (rpc): ${JSON.stringify(mezziNoAttData)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
