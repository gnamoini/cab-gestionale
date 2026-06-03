/**
 * Global Flex System — SSOT classi utility, allowlist e policy overflow.
 * Regole CSS scoped in app/globals.css sotto `.gestionale-responsive-core`.
 * NO flex-wrap globale: wrap solo esplicito in Tailwind per componente.
 */

/** Scope CSS su `<main>` gestionale (regole in globals.css). */
export const FLEX_SCOPE_CLASS = "gestionale-responsive-core";

/** Utility CSS — mapping 1:1 con @layer utilities in globals.css. */
export const flexSafe = "flex-safe";
export const flexSafeRow = "flex-safe-row";
export const flexSafeCol = "flex-safe-col";
export const flexSafeItem = "flex-safe-item";
export const flexFill = "flex-fill";
export const flexFillSafe = "flex-fill-safe";
export const flexShrinkSafe = "flex-shrink-safe";
export const textSafe = "text-safe";

/** Marker className che indicano contenimento flex-safe (lint + audit DEV). */
export const FLEX_CONTAINMENT_MARKERS = [
  "min-w-0",
  flexFill,
  flexFillSafe,
  flexSafe,
  flexSafeRow,
  flexSafeCol,
  flexSafeItem,
  textSafe,
] as const;

/** Elementi a larghezza fissa — esclusi dalla regola scoped min-width. */
export const FLEX_SHRINK_MARKERS = ["shrink-0", flexShrinkSafe] as const;

/** Token design-system / wrapper già contenuti — allowlist lint statico. */
export const FLEX_OVERFLOW_CLASS_TOKENS = [
  "globalTableWrap",
  "dsModalPanel",
  "dsLavorazioniModalDialog",
  "gestionaleModalBodyFlexClass",
  "dsScrollPanel",
  "layoutModalBodySafe",
  "layoutFlexColSafe",
  "layoutFlexSafe",
  "layoutFlexChildSafe",
  "dsPageToolbar",
  "ToolbarGroup",
] as const;

/** Allowlist file + pattern riga (kanban colonne fisse mobile). */
export const FLEX_OVERFLOW_FILE_ALLOWLIST: ReadonlyArray<{
  path: string;
  pattern: RegExp;
}> = Object.freeze([
  Object.freeze({
    path: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx",
    pattern: /lg:flex-1/,
  }),
]);

export const FLEX_OVERFLOW_ALLOWLIST = Object.freeze({
  files: Object.freeze([...FLEX_OVERFLOW_FILE_ALLOWLIST]),
  classTokens: Object.freeze([...FLEX_OVERFLOW_CLASS_TOKENS]),
  shrinkMarkers: Object.freeze([...FLEX_SHRINK_MARKERS]),
  containmentMarkers: Object.freeze([...FLEX_CONTAINMENT_MARKERS]),
}) as {
  readonly files: ReadonlyArray<{ readonly path: string; readonly pattern: RegExp }>;
  readonly classTokens: ReadonlyArray<(typeof FLEX_OVERFLOW_CLASS_TOKENS)[number]>;
  readonly shrinkMarkers: ReadonlyArray<(typeof FLEX_SHRINK_MARKERS)[number]>;
  readonly containmentMarkers: ReadonlyArray<(typeof FLEX_CONTAINMENT_MARKERS)[number]>;
};

/** True se className contiene un marker di contenimento flex-safe. */
export function hasFlexContainmentMarker(className: string): boolean {
  return FLEX_CONTAINMENT_MARKERS.some((m) => className.includes(m));
}

/** True se className contiene un token allowlisted (wrapper/modal/table). */
export function hasFlexOverflowAllowlistToken(className: string): boolean {
  return FLEX_OVERFLOW_CLASS_TOKENS.some((t) => className.includes(t));
}

/**
 * API oggetto — documentazione e accesso programmatico al Global Flex System.
 */
export const GlobalFlexSystem = {
  scopeClass: FLEX_SCOPE_CLASS,
  flexSafe,
  flexSafeRow,
  flexSafeCol,
  flexSafeItem,
  flexFill,
  flexFillSafe,
  flexShrinkSafe,
  textSafe,
  allowlist: FLEX_OVERFLOW_ALLOWLIST,
} as const;
