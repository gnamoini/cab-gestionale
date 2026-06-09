import assert from "node:assert/strict";
import { formatDocumentoRigaSintetica } from "@/lib/documenti/documenti-applicabilita";
import {
  documentoCertificazioneSenzaMarca,
  documentoSenzaMarcaConAvviso,
} from "@/lib/documenti/documenti-senza-marca-classify";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

function doc(partial: Partial<DocumentoGestionale> & Pick<DocumentoGestionale, "id" | "categoria">): DocumentoGestionale {
  return {
    nome: `${partial.id}.pdf`,
    marca: "",
    macchina: "",
    tipoFile: "pdf",
    autoreCaricamento: "Test",
    ultimaModifica: "2026-01-01",
    caricatoIl: "2026-01-01",
    dimensioneKb: 10,
    ...partial,
  };
}

{
  const cert = doc({ id: "cert-1", categoria: "certificazioni" });
  const manual = doc({ id: "man-1", categoria: "manuali" });

  assert.ok(documentoCertificazioneSenzaMarca(cert));
  assert.ok(!documentoSenzaMarcaConAvviso(cert));
  assert.ok(!documentoCertificazioneSenzaMarca(manual));
  assert.ok(documentoSenzaMarcaConAvviso(manual));

  assert.equal(formatDocumentoRigaSintetica(cert), "CERTIFICAZIONE");
  assert.equal(formatDocumentoRigaSintetica(manual), "MANUALE · Senza marca");
}

console.log("documenti-list-ui-filters.test.ts OK");
