/**
 * Integration: due create concorrenti stessa scuderia (skip senza DB).
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.log("SKIP mezzi-concurrent-duplicate-create.test.ts: DB env not configured");
  process.exit(0);
}

async function main() {
  const sb = createClient(url, key);
  const scuderia = `conc-${Date.now()}`;

  const [a, b] = await Promise.all([
    sb
      .from("mezzi")
      .insert({ cliente: "Comune X", numero_scuderia: scuderia, anno: 2020 })
      .select("id")
      .single(),
    sb
      .from("mezzi")
      .insert({ cliente: "Azienda Y", numero_scuderia: scuderia, anno: 2021 })
      .select("id")
      .single(),
  ]);

  assert.ifError(a.error);
  assert.ifError(b.error);
  const idA = a.data!.id;
  const idB = b.data!.id;
  assert.notEqual(idA, idB);

  const { data: search } = await sb.from("mezzi").select("id").eq("numero_scuderia", scuderia);
  assert.equal(search?.length, 2);

  await sb.from("mezzi").update({ cliente: "Comune X Updated" }).eq("id", idA);
  const { data: checkB } = await sb.from("mezzi").select("cliente").eq("id", idB).single();
  assert.equal(checkB?.cliente, "Azienda Y");

  await sb.from("mezzi").delete().in("id", [idA, idB]);
  console.log("mezzi-concurrent-duplicate-create.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
