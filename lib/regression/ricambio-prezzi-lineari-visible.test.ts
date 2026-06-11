import assert from "node:assert/strict";
import { ricambioPrezziLineariVisible } from "@/lib/magazzino/ricambio-prezzi-lineari-visible";

assert.equal(
  ricambioPrezziLineariVisible({ listinoOE: 0, fornitoriAlternativi: [] }),
  false,
);
assert.equal(
  ricambioPrezziLineariVisible({ listinoOE: 12.5, fornitoriAlternativi: [] }),
  true,
);
assert.equal(
  ricambioPrezziLineariVisible({
    listinoOE: 0,
    fornitoriAlternativi: [{ prezzo: 0 }, { prezzo: 9.99 }],
  }),
  true,
);
assert.equal(
  ricambioPrezziLineariVisible({
    listinoOE: 0,
    fornitoriAlternativi: [{ prezzo: 0 }],
  }),
  false,
);

console.log("ricambio-prezzi-lineari-visible.test.ts OK");
