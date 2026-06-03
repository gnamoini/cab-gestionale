/**
 * ResponsiveLayoutCore — re-export layout page/modal + alias Global Flex System.
 * SSOT flex utilities: @/lib/ui/global-flex-system
 */

import { dsScrollPanel, dsScrollX } from "@/lib/ui/scroll-system";
import {
  cabModalDialogBase,
  cabModalDialogDesktop,
  cabModalDialogMobile,
} from "@/lib/ui/ios-mobile-tokens";
import {
  flexFill,
  flexFillSafe,
  flexSafe,
  flexSafeCol,
  flexSafeItem,
  flexSafeRow,
  flexShrinkSafe,
  FLEX_SCOPE_CLASS,
  GlobalFlexSystem,
  textSafe,
} from "@/lib/ui/global-flex-system";

export {
  FLEX_SCOPE_CLASS,
  FLEX_OVERFLOW_ALLOWLIST,
  FLEX_CONTAINMENT_MARKERS,
  GlobalFlexSystem,
  flexSafe,
  flexSafeRow,
  flexSafeCol,
  flexSafeItem,
  flexFill,
  flexFillSafe,
  flexShrinkSafe,
  textSafe,
  hasFlexContainmentMarker,
  hasFlexOverflowAllowlistToken,
} from "@/lib/ui/global-flex-system";

/** Stack pagina sotto PageHeader: spacing + contenimento orizzontale. */
export const layoutPageContainer =
  "min-w-0 max-w-full overflow-x-clip space-y-[length:var(--ds-space-xl)]";

/** Root modulo / wrapper interno main (scope scroll CSS opzionale aggiunto dal modulo). */
export const layoutPageRoot = "min-w-0 max-w-full";

/** Flex row/column con contenimento min-width. */
export const layoutFlexSafe = "flex min-w-0 max-w-full";

/** Colonna flex scrollabile (drawer body, pannelli). */
export const layoutFlexColSafe = "flex min-h-0 min-w-0 max-w-full flex-col";

/** Figlio flex che deve poter restringersi sotto min-content. */
export const layoutFlexChildSafe = "min-w-0 shrink";

/** Grid responsive con contenimento. */
export const layoutGridSafe = "grid min-w-0 max-w-full";

/** Wrap orizzontale controllato (tabelle, board). */
export const layoutScrollSafe = dsScrollX;

/** Pannello scroll verticale interno (feed, log embedded). */
export const layoutScrollYSafe = `${dsScrollPanel} min-w-0 max-w-full max-sm:[scrollbar-gutter:auto]`;

/** Pannello modale/drawer: rispetta viewport, scroll nel body interno. */
export const layoutModalPanelSafe = `${cabModalDialogBase} ${cabModalDialogMobile} ${cabModalDialogDesktop} min-w-0 max-w-full`;

/** Corpo modale scrollabile (alias esplicito per Modal/Drawer). */
export const layoutModalBodySafe = layoutScrollYSafe;

/** Media inline (immagini, canvas chart). */
export const layoutMediaSafe = "max-w-full h-auto object-contain";

/** Classe scope CSS globale su `<main>` (regole in globals.css). */
export const layoutResponsiveCoreScope = FLEX_SCOPE_CLASS;

/** @deprecated Usare `flexSafe` da GlobalFlexSystem. */
export const layoutFlexSafeClass = flexSafe;

/** @deprecated Usare `flexSafeRow`. */
export const layoutFlexSafeRow = flexSafeRow;

/** @deprecated Usare `flexSafeCol`. */
export const layoutFlexSafeCol = flexSafeCol;

/** @deprecated Usare `flexFill` / `flexFillSafe`. */
export const layoutFlexFill = flexFill;

/** @deprecated Usare `flexShrinkSafe`. */
export const layoutFlexShrinkSafe = flexShrinkSafe;

/** @deprecated Usare `textSafe`. */
export const layoutTextSafe = textSafe;

/**
 * API oggetto — documentazione e accesso programmatico alle regole.
 */
export const ResponsiveLayoutCore = {
  pageContainer: layoutPageContainer,
  pageRoot: layoutPageRoot,
  flexSafe: layoutFlexSafe,
  flexColSafe: layoutFlexColSafe,
  flexChildSafe: layoutFlexChildSafe,
  gridSafe: layoutGridSafe,
  scrollSafe: layoutScrollSafe,
  scrollYSafe: layoutScrollYSafe,
  modalPanelSafe: layoutModalPanelSafe,
  modalBodySafe: layoutModalBodySafe,
  mediaSafe: layoutMediaSafe,
  scopeClass: layoutResponsiveCoreScope,
  flexSafeClass: layoutFlexSafeClass,
  flexSafeRow: layoutFlexSafeRow,
  flexSafeCol: layoutFlexSafeCol,
  flexFill: layoutFlexFill,
  flexShrinkSafe: layoutFlexShrinkSafe,
  textSafe: layoutTextSafe,
  globalFlexSystem: GlobalFlexSystem,
} as const;

/** Compone classi layout omitting falsy. */
export function layoutClass(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
