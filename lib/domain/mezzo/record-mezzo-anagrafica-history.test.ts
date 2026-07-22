import assert from "node:assert/strict";
import { diffMezzoAnagraficaHistory } from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";

/** Ponytail: verifica che il diff server-side ignori changed_fields client-trusted. */
function run() {
  const oldValues = { targa: "AA111BB", cliente: "Old" };
  const newValues = { targa: "BB222CC", cliente: "Old" };

  const trusted = diffMezzoAnagraficaHistory(oldValues, newValues);
  assert.deepEqual(trusted.changed_fields, ["targa"]);
  assert.equal(trusted.old_values.targa, "AA111BB");
  assert.equal(trusted.new_values.targa, "BB222CC");

  const spoofedClientFields = ["cliente"] as typeof trusted.changed_fields;
  const recomputed = diffMezzoAnagraficaHistory(oldValues, newValues);
  assert.notDeepEqual(spoofedClientFields, recomputed.changed_fields);

  console.log("record-mezzo-anagrafica-history.test.ts OK");
}

run();
