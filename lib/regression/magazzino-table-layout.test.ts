import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(
  resolve(import.meta.dirname, "../../components/gestionale/magazzino/magazzino-scroll.css"),
  "utf8",
);
const view = readFileSync(
  resolve(import.meta.dirname, "../../components/gestionale/magazzino/magazzino-view.tsx"),
  "utf8",
);
const lavorazioniCss = readFileSync(
  resolve(import.meta.dirname, "../../components/gestionale/lavorazioni/lavorazioni-scroll.css"),
  "utf8",
);

assert.doesNotMatch(css, /min-width:\s*68rem/, "magazzino table must fit container width");
assert.match(css, /width:\s*100%/, "magazzino dense table uses fluid width");
assert.match(css, /--gestionale-magazzino-actions-width/, "azioni column width token");
assert.match(css, /overflow-x:\s*clip/, "magazzino table scope clips horizontal overflow");
assert.match(css, /gestionale-magazzino-col-consumo/, "consumo column has responsive hide hook");
assert.doesNotMatch(lavorazioniCss, /gestionale-magazzino-dense-table/, "magazzino layout lives in magazzino-scroll.css");
assert.match(view, /magazzinoTableColMarcaClass/);
assert.match(view, /magazzinoTableColConsumoClass/);

console.log("magazzino-table-layout.test.ts OK");
