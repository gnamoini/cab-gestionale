/**
 * Rileva contenitori con scroll orizzontale intenzionale (tabelle, scope marker).
 * Condiviso tra ResponsiveLayoutAudit e OverflowRootCauseAudit.
 */

export const HORIZONTAL_SCROLL_SCOPE_MARKERS = [
  "timesheet-presenze-grid",
  "gestionale-list-table-scope",
  "lavorazioni-scroll-scope",
  "overflow-x-auto",
] as const;

export function isInsideIntentionalHorizontalScroll(el: HTMLElement): boolean {
  if (typeof window === "undefined") return false;

  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const cn = typeof node.className === "string" ? node.className : "";
    const markedScope = HORIZONTAL_SCROLL_SCOPE_MARKERS.some((m) => cn.includes(m));
    if (markedScope) return true;

    const style = window.getComputedStyle(node);
    const overflowX = style.overflowX;
    const overflow = style.overflow;
    const scrollsX =
      overflowX === "auto" ||
      overflowX === "scroll" ||
      overflow === "auto" ||
      overflow === "scroll";
    if (scrollsX && node.scrollWidth > node.clientWidth + 1) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}
