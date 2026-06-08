import assert from "node:assert/strict";
import { pruneSmokeAppSettingsValue } from "@/lib/smoke/prune-smoke-app-settings";

const TOKEN = "AUDIT-20260608-120000";

const base = {
  clienti: ["Cliente reale", `Cliente ${TOKEN}`, "Altro"],
  utilizzatori: [`Util ${TOKEN}`],
  cantieri: ["Cantiere OK"],
  marche: ["VOLVO", `MARCA-${TOKEN}`],
  modelli: [],
  tipiAttrezzatura: [`TipoAtt ${TOKEN}`],
  tipiTelaio: [],
  attrezzature: [
    { id: "m1", nome: "VOLVO", modelli: [{ id: "mo1", nome: "L150" }] },
    { id: "m2", nome: `MARCA-${TOKEN}`, modelli: [{ id: "mo2", nome: `MOD-${TOKEN}` }] },
  ],
  telai: [],
  scontoRicambiByCliente: {
    "Cliente reale": 5,
    [`Cliente ${TOKEN}`]: 10,
  },
};

const { next, removedCount } = pruneSmokeAppSettingsValue(base);

assert.equal(removedCount, 6);
assert.deepEqual(next.clienti, ["Cliente reale", "Altro"]);
assert.deepEqual(next.utilizzatori, []);
assert.deepEqual(next.marche, ["VOLVO"]);
assert.deepEqual(next.tipiAttrezzatura, []);
assert.equal((next.attrezzature as unknown[]).length, 1);
assert.equal((next.attrezzature as { nome: string }[])[0]!.nome, "VOLVO");
assert.deepEqual(next.scontoRicambiByCliente, { "Cliente reale": 5 });

const untouched = pruneSmokeAppSettingsValue({
  clienti: ["ACME Srl", "Beta SpA"],
  marche: ["Caterpillar"],
});
assert.equal(untouched.removedCount, 0);
assert.deepEqual(untouched.next.clienti, ["ACME Srl", "Beta SpA"]);

console.log("prune-smoke-app-settings.test.ts OK");
