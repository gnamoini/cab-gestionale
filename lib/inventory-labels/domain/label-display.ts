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

/** Riga marche: `BTE / OMB` se entrambe, altrimenti la presente. */
export function formatLabelMarcaLine(marca: string, marcaSecondaria?: string): string {
  const primary = labelMarcaToken(marca);
  const secondary = labelMarcaToken(marcaSecondaria ?? "");
  if (primary && secondary) return labelDisplayCaps(`${primary} / ${secondary}`);
  return labelDisplayCaps(primary || secondary);
}

/** Riga codice: `XXXX (BTE)` se marca presente. */
export function formatLabelCodiceLine(codice: string, marca?: string): string {
  const c = codice.trim();
  if (!c) return "";
  const m = labelMarcaToken(marca);
  return labelDisplayCaps(m ? `${c} (${m})` : c);
}
