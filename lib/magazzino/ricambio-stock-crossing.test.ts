import assert from "node:assert/strict";
import {
  didCrossBelowMin,
  didCrossToZero,
  shouldNotifyStockCrossing,
} from "@/lib/magazzino/ricambio-stock-crossing";

assert.equal(
  shouldNotifyStockCrossing({ scorta: 10, scortaMinima: 5 }, { scorta: 3, scortaMinima: 5 }),
  true,
);

assert.equal(
  shouldNotifyStockCrossing({ scorta: 2, scortaMinima: 5 }, { scorta: 0, scortaMinima: 5 }),
  false,
  "già sotto minimo: nessuna nuova notifica verso zero",
);

assert.equal(
  shouldNotifyStockCrossing({ scorta: 10, scortaMinima: 5 }, { scorta: 0, scortaMinima: 5 }),
  true,
  "crossing sufficiente→zero in un step notifica",
);

assert.equal(didCrossToZero({ scorta: 1, scortaMinima: 5 }, { scorta: 0, scortaMinima: 5 }), true);
assert.equal(didCrossBelowMin({ scorta: 2, scortaMinima: 5 }, { scorta: 0, scortaMinima: 5 }), false);

assert.equal(shouldNotifyStockCrossing(undefined, { scorta: 0, scortaMinima: 5 }), false);

console.log("ricambio-stock-crossing.test.ts OK");
