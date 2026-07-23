/** Evita descrizioni OCR tutte maiuscole — title case leggero (IT). */
export function formatRicambioDescrizioneForUi(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";

  const letters = [...t].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length === 0) return t;

  const upper = letters.filter((ch) => ch === ch.toUpperCase() && ch !== ch.toLowerCase()).length;
  const mostlyCaps = upper / letters.length > 0.72;
  if (!mostlyCaps) return t;

  return t
    .toLocaleLowerCase("it-IT")
    .replace(/(^|[^\p{L}])(\p{L})/gu, (_, sep, ch) => `${sep}${ch.toLocaleUpperCase("it-IT")}`);
}
