import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCollaudoOre, resolveVoceOrePrezzoManodopera, totaleCollaudoPreventivo, totaleSanificazionePreventivo } from "@/lib/preventivi/preventivi-collaudo";

test("normalizeCollaudoOre default 1 quando assente", () => {
  assert.equal(normalizeCollaudoOre(undefined), 1);
  assert.equal(normalizeCollaudoOre(null), 1);
});

test("totaleCollaudoPreventivo moltiplica ore × prezzo unitario", () => {
  assert.equal(totaleCollaudoPreventivo({ collaudoOre: 2, collaudoPrezzo: 32 }), 64);
  assert.equal(totaleCollaudoPreventivo({ collaudoPrezzo: 32 }), 32);
});

test("totaleSanificazionePreventivo moltiplica ore × prezzo unitario", () => {
  assert.equal(totaleSanificazionePreventivo({ sanificazioneOre: 2, sanificazionePrezzo: 15 }), 30);
});

test("resolveVoceOrePrezzoManodopera default 1h al costo orario", () => {
  assert.equal(resolveVoceOrePrezzoManodopera(1, 0, 32), 32);
  assert.equal(resolveVoceOrePrezzoManodopera(1, 25, 32), 25);
  assert.equal(resolveVoceOrePrezzoManodopera(2, 0, 32), 0);
});
