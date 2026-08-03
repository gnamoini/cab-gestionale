import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const view = readFileSync(
  resolve(import.meta.dirname, "../../components/preventivi/preventivi-view.tsx"),
  "utf8",
);
const shared = readFileSync(
  resolve(import.meta.dirname, "../../components/preventivi/preventivi-table-shared.tsx"),
  "utf8",
);
const cols = readFileSync(
  resolve(import.meta.dirname, "../../lib/preventivi/preventivi-table-columns.ts"),
  "utf8",
);
const css = readFileSync(
  resolve(import.meta.dirname, "../../components/gestionale/lavorazioni/lavorazioni-scroll.css"),
  "utf8",
);

assert.match(view, /gestionalePreventiviDenseTableClass/);
assert.match(view, /prevTableColNumeroClass/);
assert.match(view, /prevTableActionsRow/);
assert.match(view, /prevTableColOggettoClass/);
assert.match(view, /prevTableColIdentClass/);
assert.match(view, /PreventiviOggettoCell/);
assert.match(view, /PreventiviIdentificazioneCell/);
assert.doesNotMatch(view, /PreventiviMezzoStack/);
assert.match(view, /preventivi-table-columns/);
assert.match(cols, /prevTableColOggettoClass/);
assert.match(cols, /prevTableColProfittoClass/);
assert.match(css, /gestionale-preventivi-col-oggetto/);
assert.match(css, /gestionale-preventivi-col-profitto/);
assert.match(view, /PreventiviProfittoCell/);
assert.match(view, /Analisi Economica/);
assert.match(view, /preventivo-analisi-economica-modal/);
assert.match(shared, /PreventiviProfittoCell/);
assert.match(css, /gestionale-preventivi-col-ident/);
assert.match(view, /estimateRowHeight: 72/);
assert.doesNotMatch(view, /preventiviTableStackPrimary/);
assert.doesNotMatch(view, /gestionaleListTableClass/);

assert.match(shared, /PreventiviClienteStack/);
assert.match(shared, /prevTableColAzioniClass/);
assert.match(shared, /preventivoIdentificazioneLines/);
assert.match(shared, /break-words text-sm font-medium/);
assert.doesNotMatch(shared, /LavorazioniMezzoIdentCell/);

assert.match(css, /gestionale-preventivi-dense-table/);
assert.match(css, /gestionale-preventivi-col-stato/);
assert.match(css, /--gestionale-preventivi-actions-width/);

console.log("preventivi-table-master.test.ts OK");
