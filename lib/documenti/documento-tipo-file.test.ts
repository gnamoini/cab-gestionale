import assert from "node:assert/strict";
import { resolveDocumentoTipoFile, resolveArchiveDocumentDisplayFileName } from "@/lib/documenti/documento-tipo-file";

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
    meta: { tipoFile: "altro", fileEstensione: ".pdf" },
  }),
  "pdf",
);

assert.equal(
  resolveDocumentoTipoFile({
    urlFile: "5597abd4-5513-4063-acb6-c597088a8575/ISO-14001",
    nome: "ISO 14001",
    meta: {},
    categoria: "certificazioni",
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

assert.equal(
  resolveArchiveDocumentDisplayFileName({
    urlFile: "blobs/ab/hash",
    nome: "LISTINO RICAMBI OMB 2026",
    meta: { fileEstensione: "pdf" },
  }),
  "LISTINO RICAMBI OMB 2026.pdf",
);

assert.equal(
  resolveArchiveDocumentDisplayFileName({
    urlFile: "blobs/ab/hash",
    nome: "LISTINO RICAMBI OMB 2026",
    meta: { tipoFile: "pdf" },
  }),
  "LISTINO RICAMBI OMB 2026.pdf",
);

console.log("documento-tipo-file.test.ts OK");
