import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const formSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-form-fields.tsx"),
  "utf8",
);
const editorSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-fornitori-alternativi-editor.tsx"),
  "utf8",
);
const metaSrc = fs.readFileSync(path.join(ROOT, "lib/magazzino/magazzino-meta.ts"), "utf8");
const filtersSrc = fs.readFileSync(path.join(ROOT, "lib/magazzino/magazzino-advanced-filters.ts"), "utf8");

assert.match(formSrc, /usatoInTagliandi/);
assert.match(formSrc, /unitaMisura/);
assert.match(formSrc, /marcaOriginaleSecondaria/);
assert.match(formSrc, /RicambioFornitoriAlternativiEditor/);
assert.match(editorSrc, /magazzino:produttori/);
assert.match(metaSrc, /fornitoriAlternativi/);
assert.match(metaSrc, /usatoInTagliandi/);
assert.match(metaSrc, /unitaMisura/);
assert.match(filtersSrc, /tagliando/);
assert.match(filtersSrc, /rowMatchesTagliandoFilter/);

console.log("magazzino-ricambi-extended-policy.test.ts OK");
