import assert from "node:assert/strict";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import type { MezzoInsert } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** Mirror mergeMezzoPatch VIN precedence (scheda: preserve when empty). */
function mergeMezzoVinPatch(existing: MezzoRow, incomingVin: string): Partial<MezzoRow> {
  const patch: Partial<MezzoRow> = {};
  const norm = normalizeVin(incomingVin);
  if (norm) patch.telaio_num = norm;
  return patch;
}

const existing = {
  id: "m1",
  cliente: "Cliente",
  utilizzatore: null,
  targa: null,
  numero_scuderia: null,
  anno: 2020,
  meta: {},
  entity_key: null,
  marca_telaio: null,
  modello_telaio: null,
  tipo_telaio: null,
  telaio_num: "EXISTING1",
  km: null,
  note: null,
  created_at: "",
  updated_at: "",
} satisfies MezzoRow;

assert.deepEqual(mergeMezzoVinPatch(existing, ""), {});
assert.deepEqual(mergeMezzoVinPatch(existing, "   "), {});
assert.deepEqual(mergeMezzoVinPatch(existing, " ab123 "), { telaio_num: "AB123" });

const incoming: MezzoInsert = {
  cliente: "Cliente",
  utilizzatore: null,
  targa: null,
  numero_scuderia: null,
  anno: 2020,
  meta: {},
  entity_key: null,
  marca_telaio: null,
  modello_telaio: null,
  tipo_telaio: null,
  telaio_num: normalizeVin("  xy99 "),
  km: null,
  note: null,
};
assert.equal(incoming.telaio_num, "XY99");

console.log("merge-mezzo-vin-patch.test.ts OK");
