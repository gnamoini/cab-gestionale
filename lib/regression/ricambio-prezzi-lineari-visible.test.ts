import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ricambioPrezziLineariVisible } from "@/lib/magazzino/ricambio-prezzi-lineari-visible";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}
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

const prezziLineari = read("components/gestionale/magazzino/magazzino-prezzi-lineari.tsx");
assert.match(prezziLineari, /safeAltStr/);
assert.match(prezziLineari, /safePrezzoNum/);
assert.match(prezziLineari, /altRowLabel/);
assert.doesNotMatch(prezziLineari, /row\.fornitore\.trim\(\)/);

console.log("ricambio-prezzi-lineari-visible.test.ts OK");
