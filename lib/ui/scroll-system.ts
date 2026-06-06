/**
 * Token scroll condivisi — unica fonte per container scrollabili gestionale.
 * Stile thumb/track: `.gestionale-scrollbar` in app/globals.css (--cab-scrollbar-*).
 */

/** Classe CSS per thumb/track unificati (WebKit + Firefox thin). */
export const dsScrollbar = "gestionale-scrollbar";

/** Scroll verticale principale pagina (main AppShell): gutter stable + iOS touch. */
export const dsScrollY = "gestionale-scroll-y";

/** Pannello modale/drawer: corpo scrollabile dentro flex column. */
export const dsScrollPanel =
  "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain gestionale-scrollbar";

/** Wrap orizzontale tabella o board. */
export const dsScrollX =
  "min-w-0 overflow-x-auto overscroll-x-contain gestionale-scrollbar";

/** Sentinel in fondo al contenuto main — spazio scrollabile extra (--cab-scroll-end-pad). */
export const dsGestionaleScrollEndPad = "gestionale-scroll-end-pad";
