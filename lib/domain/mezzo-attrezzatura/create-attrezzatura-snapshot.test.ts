import assert from "node:assert/strict";
import { createAttrezzaturaSnapshot } from "@/lib/domain/mezzo-attrezzatura/create-attrezzatura-snapshot";

const snap = createAttrezzaturaSnapshot({
  id: "att-1",
  marca: " CAT ",
  modello: "320 ",
  matricola: " MAT-1 ",
  tipoAttrezzatura: " Escavatore ",
  capturedAt: "2026-01-01T00:00:00.000Z",
});

assert.equal(snap.marca, "CAT");
assert.equal(snap.modello, "320");
assert.equal(snap.matricola, "MAT-1");
assert.equal(snap.tipoAttrezzatura, "Escavatore");
assert.equal(Object.isFrozen(snap), true);

assert.throws(() => {
  (snap as { marca: string }).marca = "x";
});

console.log("create-attrezzatura-snapshot.test.ts OK");
