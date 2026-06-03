import assert from "node:assert/strict";
import { buildDocumentiCatalogFromImpostazioni } from "@/lib/documenti/documenti-catalog";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const prefs: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "m-schmidt",
      nome: "Schmidt",
      modelli: [
        { id: "mod-cleango", nome: "Cleango 500 ET" },
        { id: "mod-swingo", nome: "Swingo 200" },
      ],
    },
  ],
};

{
  const catalog = buildDocumentiCatalogFromImpostazioni(prefs, []);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0]!.nome, "Schmidt");
  assert.deepEqual(
    catalog[0]!.macchine.map((m) => m.nome),
    ["Cleango 500 ET", "Swingo 200"],
  );
}

console.log("documenti-catalog.test.ts OK");
