import assert from "node:assert/strict";
import {
  prezzoVenditaDaListinoEMarkup,
  resolveListinoMarkupBase,
} from "./calculations";
import {
  ricambioScortaDeltaFromBaseline,
  syncPrezzoVenditaInForm,
  emptyRicambioForm,
} from "./form";

assert.equal(resolveListinoMarkupBase(100, []), 100);
assert.equal(resolveListinoMarkupBase(0, []), 0);
assert.equal(
  resolveListinoMarkupBase(0, [
    { prezzo: 50, sconto: 0 },
    { prezzo: 80, sconto: 10 },
  ]),
  80,
);
assert.equal(
  resolveListinoMarkupBase(0, [
    { prezzo: 100, sconto: 50 },
    { prezzo: 60, sconto: 0 },
  ]),
  60,
);
assert.equal(resolveListinoMarkupBase(12, [{ prezzo: 99, sconto: 0 }]), 12);

const synced = syncPrezzoVenditaInForm({
  ...emptyRicambioForm(),
  prezzoFornitoreOriginale: "0",
  markupPercentuale: "50",
  fornitoriAlternativi: [
    {
      id: "a",
      fornitore: "F1",
      produttore: "",
      codice: "",
      prezzo: "40",
      sconto: "0",
    },
    {
      id: "b",
      fornitore: "F2",
      produttore: "",
      codice: "",
      prezzo: "100",
      sconto: "20",
    },
  ],
});
assert.equal(synced.prezzoVendita, String(prezzoVenditaDaListinoEMarkup(100, 50)));

assert.equal(
  ricambioScortaDeltaFromBaseline({ scorta: "5" }, { scorta: "5" }),
  0,
);
assert.equal(
  ricambioScortaDeltaFromBaseline({ scorta: "5" }, { scorta: "8" }),
  3,
);

console.log("calculations.test.ts OK");
