import type { CSSProperties } from "react";

/** Sopra toolbar sticky, thead e header; sotto toast/modali full-screen. */
export const GLOBAL_DROPDOWN_PORTAL_Z = 130;

export const GLOBAL_DROPDOWN_MENU_GAP = 6;

export const GLOBAL_DROPDOWN_VIEWPORT_PAD = 8;

/** Altezza massima default menu scrollabile. */
export const GLOBAL_DROPDOWN_MAX_HEIGHT = 320;

export type GlobalDropdownPlacement = "top" | "bottom";

export type GlobalDropdownCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  scrollInside: boolean;
  placement: GlobalDropdownPlacement;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Classe `transform-origin` per animazione apertura coerente con il lato del menu. */
export function globalDropdownPlacementOriginClass(placement: string): string {
  return placement.startsWith("top") ? "origin-bottom" : "origin-top";
}

/**
 * Calcolo posizione fallback (senza Floating UI).
 * Preferire `useGlobalDropdownPortal` per flip/shift/auto-update.
 */
export function computeGlobalDropdownCoords(
  anchor: HTMLElement,
  contentHeight?: number,
  gap = GLOBAL_DROPDOWN_MENU_GAP,
): GlobalDropdownCoords {
  const rect = anchor.getBoundingClientRect();
  const pad = GLOBAL_DROPDOWN_VIEWPORT_PAD;
  const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
  const spaceAbove = rect.top - gap - pad;
  const openAbove = spaceBelow < 140 && spaceAbove > spaceBelow;
  const available = Math.max(80, openAbove ? spaceAbove : spaceBelow);
  const needed = contentHeight ?? 0;
  const scrollInside = needed > 0 && needed > available;
  const maxHeight = needed > 0 ? Math.min(needed, available) : available;

  const width = rect.width;
  let left = rect.left;
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - pad - width);
  }
  if (left < pad) left = pad;

  const top = openAbove
    ? Math.max(pad, rect.top - gap - (scrollInside ? maxHeight : Math.min(maxHeight, needed || maxHeight)))
    : rect.bottom + gap;

  return {
    top,
    left,
    width,
    maxHeight,
    scrollInside,
    placement: openAbove ? "top" : "bottom",
  };
}

export function globalDropdownFixedStyle(coords: GlobalDropdownCoords): CSSProperties {
  return {
    position: "fixed",
    left: coords.left,
    width: coords.width,
    maxHeight: coords.maxHeight,
    top: coords.top,
    zIndex: GLOBAL_DROPDOWN_PORTAL_Z,
  };
}
