/** Limiti lunghezza testo condivisi (input security INP-016). */

export const TEXT_SHORT = 120;
export const TEXT_MEDIUM = 500;
export const TEXT_LONG = 2000;
export const TEXT_EXTRA = 8000;

export const PROMEMORIA_DESCRIPTION_MAX = TEXT_LONG;

export function clampText(value: string, max: number): string {
  if (max <= 0) return "";
  return value.length <= max ? value : value.slice(0, max);
}

export function clampTextTrimmed(value: string | null | undefined, max: number): string {
  return clampText((value ?? "").trim(), max);
}

export function clampTextOrNull(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return clampText(t, max);
}

/** Tronca input controllato per onChange (evita superare maxLength lato UI). */
export function sliceInputValue(value: string, max: number): string {
  return clampText(value, max);
}
