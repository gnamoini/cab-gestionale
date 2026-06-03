import assert from "node:assert/strict";
import {
  didCrossBelowMin,
  isStockBelowMin,
  isStockSufficient,
  stockSnapshotFromRicambio,
} from "@/lib/magazzino/ricambio-stock-crossing";

assert.equal(isStockSufficient({ scorta: 10, scortaMinima: 5 }), true);
assert.equal(isStockBelowMin({ scorta: 4, scortaMinima: 5 }), true);
assert.equal(isStockBelowMin({ scorta: 10, scortaMinima: 0 }), false);

assert.equal(didCrossBelowMin({ scorta: 10, scortaMinima: 5 }, { scorta: 4, scortaMinima: 5 }), true);
assert.equal(didCrossBelowMin({ scorta: 3, scortaMinima: 5 }, { scorta: 2, scortaMinima: 5 }), false);
assert.equal(didCrossBelowMin({ scorta: 10, scortaMinima: 5 }, { scorta: 8, scortaMinima: 5 }), false);
assert.equal(didCrossBelowMin({ scorta: 10, scortaMinima: 0 }, { scorta: 0, scortaMinima: 0 }), false);

assert.deepEqual(stockSnapshotFromRicambio({ scorta: -1, scortaMinima: 3.7 }), {
  scorta: 0,
  scortaMinima: 4,
});

console.log("ricambio-stock-crossing.test.ts OK");
