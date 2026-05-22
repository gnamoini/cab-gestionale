import type { CSSProperties } from "react";

/** Sopra toolbar sticky, thead e header; sotto toast/modali full-screen. */
export const GLOBAL_DROPDOWN_PORTAL_Z = 130;

export const GLOBAL_DROPDOWN_MENU_GAP = 6;

export type GlobalDropdownCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  scrollInside: boolean;
};

export function computeGlobalDropdownCoords(
  anchor: HTMLElement,
  contentHeight?: number,
  gap = GLOBAL_DROPDOWN_MENU_GAP,
): GlobalDropdownCoords {
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
  const needed = contentHeight ?? 0;
  const available = Math.max(80, spaceBelow);
  const scrollInside = needed > 0 && needed > available;
  const maxHeight = needed > 0 ? Math.min(needed, available) : available;

  return {
    top: rect.bottom + gap,
    left: rect.left,
    width: rect.width,
    maxHeight,
    scrollInside,
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
