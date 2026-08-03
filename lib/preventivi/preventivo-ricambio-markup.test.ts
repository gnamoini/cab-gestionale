import assert from "node:assert/strict";
import { test } from "node:test";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  resolvePreventivoRigaRicambioCostoUnitario,
  resolvePreventivoRigaRicambioMarkup,
} from "@/lib/preventivi/preventivo-ricambio-markup";

const mag: RicambioMagazzino = {
  id: "mag-1",
  marca: "Test",
  codiceFornitoreOriginale: "OE1",
  codiceFornitoreOriginaleSecondario: "",
  marcaOriginaleSecondaria: "",
  usatoInTagliandi: false,
  unitaMisura: "pz",
  descrizione: "Olio",
  note: "",
  categoria: "",
  compatibilitaMezzi: [],
  scorta: 0,
  scortaMinima: 0,
  dataUltimaModifica: "",
  autoreUltimaModifica: "",
  prezzoFornitoreOriginale: 40,
  scontoFornitoreOriginale: 0,
  markupPercentuale: 25,
  prezzoVendita: 50,
  fornitoriAlternativi: [],
  fornitoreNonOriginale: "",
  codiceFornitoreNonOriginale: "",
  prezzoFornitoreNonOriginale: 0,
  scontoFornitoreNonOriginale: 0,
};

test("resolvePreventivoRigaRicambioMarkup — magazzino salvato", () => {
  const m = resolvePreventivoRigaRicambioMarkup(
    { id: "r1", ricambioId: "mag-1", codiceOE: "", descrizione: "", quantita: 1, prezzoUnitario: 50, scontoPercent: 0 },
    mag,
  );
  assert.equal(m.source, "magazzino");
  assert.equal(m.percent, 25);
});

test("resolvePreventivoRigaRicambioMarkup — calcolato da prezzo e costo", () => {
  const m = resolvePreventivoRigaRicambioMarkup(
    {
      id: "r1",
      ricambioId: null,
      codiceOE: "",
      descrizione: "",
      quantita: 1,
      prezzoUnitario: 60,
      costoUnitario: 40,
      scontoPercent: 0,
    },
    null,
  );
  assert.equal(m.source, "calcolato");
  assert.equal(m.percent, 50);
});

test("resolvePreventivoRigaRicambioCostoUnitario — snapshot riga", () => {
  assert.equal(
    resolvePreventivoRigaRicambioCostoUnitario(
      {
        id: "r1",
        ricambioId: null,
        codiceOE: "",
        descrizione: "",
        quantita: 1,
        prezzoUnitario: 10,
        costoUnitario: 33,
        scontoPercent: 0,
      },
      mag,
    ),
    33,
  );
});
