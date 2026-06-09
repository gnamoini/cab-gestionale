import assert from "node:assert/strict";
import { resolveDocumentoTipoFile } from "@/lib/documenti/documento-tipo-file";

assert.equal(
  resolveDocumentoTipoFile({
    urlFile: "a1b2/ISO-14001",
    nome: "ISO 14001",
    meta: { fileEstensione: ".pdf" },
  }),
  "pdf",
);

assert.equal(
  resolveDocumentoTipoFile({
    urlFile: "a1b2/certificato.pdf",
    nome: "ISO 45001",
    meta: {},
  }),
  "pdf",
);

assert.equal(
  resolveDocumentoTipoFile({
    urlFile: "a1b2/file",
    nome: "ISO 14001",
    meta: { tipoFile: "pdf" },
  }),
  "pdf",
);

console.log("documento-tipo-file.test.ts OK");
