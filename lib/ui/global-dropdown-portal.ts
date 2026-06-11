import type { CSSProperties } from "react";
import {
  computeKeyboardInset,
  findStickyObstructions,
  getVisualViewportBand,
} from "@/lib/ui/mobile-modal-behavior";

/** Sopra toolbar sticky, thead e header; sotto toast/modali full-screen. */
export const GLOBAL_DROPDOWN_PORTAL_Z = 130;

export const GLOBAL_DROPDOWN_MENU_GAP = 6;

export const GLOBAL_DROPDOWN_VIEWPORT_PAD = 8;

/** Altezza massima default menu scrollabile. */
export const GLOBAL_DROPDOWN_MAX_HEIGHT = 320;

function readSafeAreaPx(edge: "top" | "bottom"): number {
  if (typeof document === "undefined") return 0;
  const prop = edge === "top" ? "--cab-safe-top" : "--cab-safe-bottom";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

/** Padding collision Floating UI — tastiera virtuale, safe-area e header sticky. */
export function getFloatingUiBoundaryPadding(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const base = GLOBAL_DROPDOWN_VIEWPORT_PAD;
  if (typeof window === "undefined") {
    return { top: base, right: base, bottom: base, left: base };
  }

  const vv = getVisualViewportBand();
  const keyboardInset = computeKeyboardInset();
  const safeTop = readSafeAreaPx("top");
  const safeBottom = readSafeAreaPx("bottom");
  const stickyBottom = findStickyObstructions(document);

  const topPad = Math.max(base, vv.top + safeTop, stickyBottom > 0 ? stickyBottom - vv.top + base : 0);
  const bottomPad = Math.max(base, keyboardInset + safeBottom);

  return { top: topPad, right: base, bottom: bottomPad, left: base };
}

/**
 * Collision detection per menu portal: usa il viewport, non i clipping ancestor
 * del form/modale (`overflow:hidden`), così l'elenco può sovrapporsi ai campi sotto.
 */
export function globalDropdownPortalDetectOverflowOptions(): {
  padding: { top: number; right: number; bottom: number; left: number };
  rootBoundary: "viewport";
  boundary?: Element;
} {
  return {
    padding: getFloatingUiBoundaryPadding(),
    rootBoundary: "viewport",
    boundary: typeof document !== "undefined" ? document.documentElement : undefined,
  };
}

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
  const vv = getVisualViewportBand();
  const { bottom: bottomPad } = getFloatingUiBoundaryPadding();
  const visibleBottom = vv.bottom - (bottomPad - pad);
  const visibleTop = vv.top + pad;

  const spaceBelow = visibleBottom - rect.bottom - gap - pad;
  const spaceAbove = rect.top - gap - visibleTop;
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
    ? Math.max(visibleTop, rect.top - gap - (scrollInside ? maxHeight : Math.min(maxHeight, needed || maxHeight)))
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
