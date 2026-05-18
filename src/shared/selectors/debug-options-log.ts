/** Abilita con `NEXT_PUBLIC_DEBUG_SELECT_OPTIONS=1` */
export const SELECT_OPTIONS_DEBUG =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_SELECT_OPTIONS === "1";

export function debugSelectOptions(source: string, meta: Record<string, unknown>): void {
  if (!SELECT_OPTIONS_DEBUG) return;
  console.warn(`[select-options] ${source}`, meta);
}
