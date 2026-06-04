import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  repairCompatIfNeededSync,
  simulateRepair,
} from "@/lib/magazzino/compat/compat-auto-repair-engine";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const mezziListe: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "m-fiat",
      nome: "FIAT",
      modelli: [{ id: "mod-500", nome: "500" }],
    },
  ],
  telai: [],
};

const fiat500 = compatLabelMarcaModello("FIAT", "500");
const refs = [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }];

function baseRicambio(over: Partial<RicambioMagazzino> = {}): RicambioMagazzino {
  return defaultRicambioMagazzinoFields({
    id: "r1",
    marca: "BOSCH",
    codiceFornitoreOriginale: "ABC",
    descrizione: "Test",
    compatibilitaMezzi: [fiat500],
    compatibilitaRefs: refs,
    scorta: 1,
    prezzoFornitoreOriginale: 10,
    prezzoVendita: 10,
    ...over,
  });
}

const sim = simulateRepair(
  baseRicambio({ compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "Panda")] }),
  mezziListe,
);
assert.equal(sim.changed, false);
assert.equal(sim.report.status, "repairable");

const repaired = repairCompatIfNeededSync(
  baseRicambio({ compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "Panda")] }),
  mezziListe,
);
assert.equal(repaired.changed, true);
assert.deepEqual(repaired.ricambio.compatibilitaMezzi, [fiat500]);

const orphanOnly = repairCompatIfNeededSync(
  baseRicambio({
    compatibilitaRefs: [{ tree: "attrezzature", marcaId: "gone", modelloId: "gone" }],
    compatibilitaMezzi: [],
  }),
  mezziListe,
);
assert.equal(orphanOnly.changed, false);
assert.equal(orphanOnly.report.status, "warn");

console.log("compat-auto-repair-engine.test.ts OK");
