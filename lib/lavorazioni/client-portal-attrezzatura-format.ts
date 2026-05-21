/** Valore mostrabile in etichette attrezzatura (esclude vuoto e segnaposto "—"). */
export function attrezzaturaDisplayPart(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t || t === "—") return null;
  return t;
}

/** Solo marca e modello (spazio, senza puntino). Portale clienti: no tipo attrezzatura. */
export function formatClientPortalAttrezzatura(opts: {
  marca?: string | null;
  modello?: string | null;
}): string {
  const marcaModello = [attrezzaturaDisplayPart(opts.marca), attrezzaturaDisplayPart(opts.modello)]
    .filter(Boolean)
    .join(" ");
  return marcaModello || "—";
}
