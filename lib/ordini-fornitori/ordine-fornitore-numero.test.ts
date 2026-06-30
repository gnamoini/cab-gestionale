import assert from "node:assert/strict";
import {
  formatOrdineFornitoreNumero,
  isOrdineFornitoreNumero,
  nextOrdineNumeroFromRecords,
} from "@/lib/ordini-fornitori/ordine-fornitore-numero";
import { formatPreventivoNumeroManuale, isPreventivoNumeroManuale } from "@/lib/preventivi/preventivo-numero-manuale";

assert.equal(formatOrdineFornitoreNumero(2026, 1), "26-0001/O");
assert.ok(isOrdineFornitoreNumero("26-0042/O"));
assert.ok(!isOrdineFornitoreNumero("26-0042/M"));
assert.ok(!isPreventivoNumeroManuale("26-0042/O"));
assert.ok(isPreventivoNumeroManuale("26-0042/M"));
assert.equal(
  nextOrdineNumeroFromRecords([{ numero: "26-0003/O" }, { numero: "26-0001/O" }], 2026),
  "26-0004/O",
);
assert.equal(formatPreventivoNumeroManuale(2026, 1), "26-0001/M");

console.log("ordine-fornitore-numero.test.ts OK");
