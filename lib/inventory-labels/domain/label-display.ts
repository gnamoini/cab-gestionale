import type { LabelPayload } from "@/lib/inventory-labels/domain/types";

const PLACEHOLDER_MARCA = new Set(["—", "-", "–", "nessuna marca"]);

function normMarcaToken(value: string | undefined | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function labelMarcaToken(value: string | undefined | null): string {
  const t = normMarcaToken(value);
  if (!t) return "";
  if (PLACEHOLDER_MARCA.has(t.toLowerCase())) return "";
  return t;
}

export function labelDisplayCaps(text: string): string {
  const t = text.trim();
  return t ? t.toLocaleUpperCase("it-IT") : "";
}

/** Riga marca principale (senza secondaria). */
export function formatLabelMarcaLine(marca: string, _marcaSecondaria?: string): string {
  return labelDisplayCaps(labelMarcaToken(marca));
}

/** Riga marca secondaria / alternativa commerciale. */
export function formatLabelMarcaSecondariaLine(marcaSecondaria?: string): string {
  return labelDisplayCaps(labelMarcaToken(marcaSecondaria ?? ""));
}

export function shouldRenderMarcaSecondaria(
  payload: Pick<LabelPayload, "marca" | "marcaSecondaria" | "fornitoreAlternativo">,
): boolean {
  const sec = labelMarcaToken(payload.marcaSecondaria);
  if (!sec) return false;
  const primary = labelMarcaToken(payload.marca);
  const fornitore = labelMarcaToken(payload.fornitoreAlternativo);
  return sec !== primary && sec !== fornitore;
}

/** Riga codice cliente: solo codice OE, senza suffisso marca. */
export function formatLabelCodiceCliente(codice: string): string {
  return labelDisplayCaps(codice.trim());
}

/** Riga codice: `XXXX (BTE)` se marca presente. */
export function formatLabelCodiceLine(codice: string, marca?: string): string {
  const c = codice.trim();
  if (!c) return "";
  const m = labelMarcaToken(marca);
  return labelDisplayCaps(m ? `${c} (${m})` : c);
}
