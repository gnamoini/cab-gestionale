import type { CSSProperties } from "react";
import { dsZTooltip } from "@/lib/ui/design-system";

/** Sopra sticky table / dropdown; sotto toast (200). */
export const TOOLTIP_PORTAL_Z = 190;
export const TOOLTIP_GAP = 6;
/** Tooltip vicino ai tasti icona shell (menu, indietro, chiudi, aggiorna). */
export const TOOLTIP_GAP_SHELL_NAV = 2;
export const TOOLTIP_VIEWPORT_PAD = 8;

export const CAB_TOOLTIP_PORTAL_ATTR = "data-cab-tooltip-portal";
export const CAB_TOOLTIP_ROOT_ID = "cab-tooltip-root";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export type TooltipCoords = {
  top: number;
  left: number;
  side: TooltipSide;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function fitsTop(anchor: DOMRect, content: DOMRect, gap: number, pad: number): boolean {
  return anchor.top - gap - content.height >= pad;
}

function fitsBottom(anchor: DOMRect, content: DOMRect, gap: number, pad: number): boolean {
  return anchor.bottom + gap + content.height <= window.innerHeight - pad;
}

function fitsLeft(anchor: DOMRect, content: DOMRect, gap: number, pad: number): boolean {
  return anchor.left - gap - content.width >= pad;
}

function fitsRight(anchor: DOMRect, content: DOMRect, gap: number, pad: number): boolean {
  return anchor.right + gap + content.width <= window.innerWidth - pad;
}

function coordsForSide(
  anchor: DOMRect,
  content: DOMRect,
  side: TooltipSide,
  gap: number,
): TooltipCoords {
  switch (side) {
    case "top":
      return {
        top: anchor.top - gap - content.height,
        left: anchor.left + anchor.width / 2 - content.width / 2,
        side,
      };
    case "bottom":
      return {
        top: anchor.bottom + gap,
        left: anchor.left + anchor.width / 2 - content.width / 2,
        side,
      };
    case "left":
      return {
        top: anchor.top + anchor.height / 2 - content.height / 2,
        left: anchor.left - gap - content.width,
        side,
      };
    case "right":
      return {
        top: anchor.top + anchor.height / 2 - content.height / 2,
        left: anchor.right + gap,
        side,
      };
  }
}

function clampCoords(coords: TooltipCoords, content: DOMRect, pad: number): TooltipCoords {
  const maxLeft = window.innerWidth - pad - content.width;
  const maxTop = window.innerHeight - pad - content.height;
  return {
    ...coords,
    left: clamp(coords.left, pad, Math.max(pad, maxLeft)),
    top: clamp(coords.top, pad, Math.max(pad, maxTop)),
  };
}

/** Posiziona tooltip rispetto all'anchor con flip top → bottom → right → left. */
export function computeTooltipCoords(
  anchor: HTMLElement,
  contentEl: HTMLElement,
  preferredSide: TooltipSide = "top",
  gap = TOOLTIP_GAP,
  pad = TOOLTIP_VIEWPORT_PAD,
): TooltipCoords {
  const anchorRect = anchor.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();

  const order: TooltipSide[] = [preferredSide];
  for (const s of ["top", "bottom", "right", "left"] as const) {
    if (!order.includes(s)) order.push(s);
  }

  const fits: Record<TooltipSide, boolean> = {
    top: fitsTop(anchorRect, contentRect, gap, pad),
    bottom: fitsBottom(anchorRect, contentRect, gap, pad),
    left: fitsLeft(anchorRect, contentRect, gap, pad),
    right: fitsRight(anchorRect, contentRect, gap, pad),
  };

  const side = order.find((s) => fits[s]) ?? preferredSide;
  return clampCoords(coordsForSide(anchorRect, contentRect, side, gap), contentRect, pad);
}

export function tooltipFixedStyle(coords: TooltipCoords): CSSProperties {
  return {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    zIndex: TOOLTIP_PORTAL_Z,
  };
}

export function tooltipTransformOrigin(side: TooltipSide): string {
  switch (side) {
    case "top":
      return "center bottom";
    case "bottom":
      return "center top";
    case "left":
      return "right center";
    case "right":
      return "left center";
  }
}

/** Stili inline portal — sfondo opaco + layer compositor dedicato. */
export function tooltipPortalInlineStyle(side: TooltipSide): CSSProperties {
  return {
    position: "fixed",
    zIndex: TOOLTIP_PORTAL_Z,
    transformOrigin: tooltipTransformOrigin(side),
    opacity: 1,
    backgroundColor: "var(--cab-card)",
    color: "var(--cab-text)",
    transform: "translateZ(0)",
  };
}

/** Container portal — ultimo figlio di body, sopra sticky/scroll table. */
export function getTooltipPortalContainer(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("getTooltipPortalContainer requires document");
  }
  let root = document.getElementById(CAB_TOOLTIP_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = CAB_TOOLTIP_ROOT_ID;
    root.setAttribute("data-cab-tooltip-root", "");
    root.style.cssText = `position:fixed;inset:0;z-index:${TOOLTIP_PORTAL_Z};pointer-events:none;isolation:isolate;`;
    document.body.appendChild(root);
  }
  return root;
}

type PopoverElement = HTMLElement & { showPopover?: () => void; hidePopover?: () => void };

export function showTooltipPopover(el: HTMLElement | null): void {
  if (!el?.isConnected) return;
  const pop = el as PopoverElement;
  if (typeof pop.showPopover !== "function") return;
  try {
    pop.showPopover();
  } catch {
    /* già aperto o nodo smontato */
  }
}

export function hideTooltipPopover(el: HTMLElement | null): void {
  if (!el?.isConnected) return;
  const pop = el as PopoverElement;
  if (typeof pop.hidePopover !== "function") return;
  try {
    pop.hidePopover();
  } catch {
    /* già chiuso o nodo smontato */
  }
}

/** Classe z-index condivisa (allineata a TOOLTIP_PORTAL_Z). */
export const dsTooltipZClass = dsZTooltip;
