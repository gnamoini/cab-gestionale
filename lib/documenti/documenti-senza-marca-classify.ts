import { resolveDocumentoApplicazione } from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

const MARCA_NON_ASSEGNATA_SENTINELS = new Set(["", "—", "-", "n/a", "na"]);

/** True se il documento non ha una marca valida (vuota o segnaposto). */
export function documentoHaMarcaAssegnata(doc: DocumentoGestionale): boolean {
  const r = resolveDocumentoApplicazione(doc);
  const m = (r.marcaKey ?? r.marca).trim().toLowerCase();
  return m.length > 0 && !MARCA_NON_ASSEGNATA_SENTINELS.has(m);
}

export function documentoSenzaMarca(doc: DocumentoGestionale): boolean {
  return !documentoHaMarcaAssegnata(doc);
}

/** Certificazione senza marca — collocazione dedicata, senza avviso. */
export function documentoCertificazioneSenzaMarca(doc: DocumentoGestionale): boolean {
  return doc.categoria === "certificazioni" && documentoSenzaMarca(doc);
}

/** Senza marca che richiede sezione warning (esclusi certificazioni). */
export function documentoSenzaMarcaConAvviso(doc: DocumentoGestionale): boolean {
  return documentoSenzaMarca(doc) && doc.categoria !== "certificazioni";
}
