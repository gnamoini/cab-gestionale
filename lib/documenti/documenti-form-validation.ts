import type { DocumentoApplicabilita } from "@/lib/types/gestionale";

export type DocumentoMarcaModelloValidation = {
  marcaInvalid: boolean;
  modelloInvalid: boolean;
  valid: boolean;
};

/** Validazione marca/modello allineata alle select gerarchia (non al catalogo albero). */
export function validateDocumentoMarcaModelloFields(
  applicabilita: DocumentoApplicabilita,
  marcaTrim: string,
  modelloTrim: string,
): DocumentoMarcaModelloValidation {
  const modelloInvalid = applicabilita === "modello" && marcaTrim.length > 0 && modelloTrim.length === 0;
  return {
    marcaInvalid: false,
    modelloInvalid,
    valid: !modelloInvalid,
  };
}

export function effectiveDocumentoApplicabilita(
  categoria: string,
  applicabilita: DocumentoApplicabilita,
): DocumentoApplicabilita {
  if (categoria === "listini") return "marca";
  return applicabilita;
}
