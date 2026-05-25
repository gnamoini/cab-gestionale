/** Fallback ref label quando codice umano non ancora assegnato. */
function lavorazioneRefLabelFallback(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t.toUpperCase();
  return `#${t.slice(0, 8).toUpperCase()}`;
}

/** Codice umano per UI/PDF (es. 26-0001). Fallback su ref label UUID se assente. */
export function lavorazioneDisplayCodice(row: { codice?: string | null; id: string }): string {
  const c = row.codice?.trim();
  if (c) return c;
  return lavorazioneRefLabelFallback(row.id);
}
