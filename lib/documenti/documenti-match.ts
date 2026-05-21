import { resolveDocumentoApplicazione } from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

function norm(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.length > 0 && t !== "—";
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Documento visibile per un mezzo se marca coincide e:
 * - ambito «tutta la marca», oppure
 * - ambito «modello» e il modello del documento coincide con quello del mezzo.
 */
export function documentoMatchesMarcaModello(
  doc: DocumentoGestionale,
  marcaMezzo: string,
  modelloMezzo: string,
): boolean {
  const r = resolveDocumentoApplicazione(doc);
  const docMarca = (r.marcaKey ?? r.marca).trim();
  if (!norm(docMarca) || !sameText(docMarca, marcaMezzo)) return false;

  if (r.applicabilita === "marca") return true;

  const docModello = (r.modelloKey ?? r.macchina).trim();
  if (!norm(docModello)) return true;
  const modMezzo = modelloMezzo.trim();
  if (!norm(modMezzo)) return false;
  return sameText(docModello, modMezzo);
}
