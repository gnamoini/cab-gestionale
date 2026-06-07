import assert from "node:assert/strict";
import test from "node:test";
import {
  collectAddettiNamesFromSchedaContenuto,
  partitionAddettiInUso,
} from "@/lib/lavorazioni/addetti-in-uso";

test("collectAddettiNamesFromSchedaContenuto — ingresso addettoAccettazione", () => {
  const contenuto = {
    doc: {
      tipo: "ingresso",
      campi: { addettoAccettazione: "  Mario Rossi  " },
    },
  };
  assert.deepEqual(collectAddettiNamesFromSchedaContenuto("ingresso", contenuto), ["Mario Rossi"]);
});

test("collectAddettiNamesFromSchedaContenuto — interventi righe addettiAssegnati", () => {
  const contenuto = {
    doc: {
      tipo: "lavorazioni",
      campi: {
        righe: [
          {
            addettiAssegnati: [
              { addetto: "Luigi", oreImpiegate: 2 },
              { addetto: "  Paolo  ", oreImpiegate: 1 },
            ],
          },
        ],
      },
    },
  };
  assert.deepEqual(collectAddettiNamesFromSchedaContenuto("interventi", contenuto), ["Luigi", "Paolo"]);
});

test("collectAddettiNamesFromSchedaContenuto — ignora em dash e vuoti", () => {
  const contenuto = {
    doc: { campi: { addettoAccettazione: "—" } },
  };
  assert.deepEqual(collectAddettiNamesFromSchedaContenuto("ingresso", contenuto), []);
});

test("partitionAddettiInUso — attivi vs storico per archived", () => {
  const result = partitionAddettiInUso(
    [
      { id: "lav-1", archived: false },
      { id: "lav-2", archived: true },
    ],
    [
      {
        lavorazione_id: "lav-1",
        tipo: "ingresso",
        contenuto: { doc: { campi: { addettoAccettazione: "Attivo" } } },
      },
      {
        lavorazione_id: "lav-2",
        tipo: "interventi",
        contenuto: {
          doc: {
            campi: { righe: [{ addettiAssegnati: [{ addetto: "Storico", oreImpiegate: 1 }] }] },
          },
        },
      },
    ],
  );
  assert.deepEqual(result.attivi, ["Attivo"]);
  assert.deepEqual(result.storico, ["Storico"]);
});
