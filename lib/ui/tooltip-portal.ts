import type { CSSProperties } from "react";
import { dsZTooltip } from "@/lib/ui/design-system";

export const TOOLTIP_PORTAL_Z = 140;
export const TOOLTIP_GAP = 6;
export const TOOLTIP_VIEWPORT_PAD = 8;

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

/** Classe z-index condivisa (allineata a TOOLTIP_PORTAL_Z). */
export const dsTooltipZClass = dsZTooltip;
