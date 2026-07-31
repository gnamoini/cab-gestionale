import assert from "node:assert/strict";
import {
  preventivoTipoDocumentoBadgeClass,
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";

assert.equal(preventivoTipoDocumentoLabel("preventivo", "chip"), "Prev");
assert.equal(preventivoTipoDocumentoLabel("consuntivo", "chip"), "Cons");
assert.match(preventivoTipoDocumentoBadgeClass("preventivo", "table"), /orange/);
assert.match(preventivoTipoDocumentoBadgeClass("consuntivo", "table"), /sky/);
assert.match(preventivoTipoDocumentoBadgeClass("preventivo", "inline"), /rounded-full/);

console.log("preventivi-tipo-documento.test.ts: ok");
