import type { PointerEvent as ReactPointerEvent } from "react";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";

/** ponytail: slop fisso px — upgrade path: pointer-type aware slop da platform. */
export const SELECTOR_SHEET_TAP_SLOP_PX = 12;

type SheetTapSelectHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
};

function releaseCapture(e: ReactPointerEvent): void {
  const el = e.currentTarget;
  if (typeof el?.hasPointerCapture === "function" && el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
}

/** Distingue tap da scroll nella lista sheet mobile — select solo su tap senza slop. */
export function createSelectorSheetTapSelectHandlers(
  onSelect: () => void,
): SheetTapSelectHandlers {
  let startX = 0;
  let startY = 0;
  let scrolling = false;

  return {
    onPointerDown: (e) => {
      scrolling = false;
      startX = e.clientX;
      startY = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (scrolling) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > SELECTOR_SHEET_TAP_SLOP_PX || dy > SELECTOR_SHEET_TAP_SLOP_PX) {
        scrolling = true;
      }
    },
    onPointerUp: (e) => {
      releaseCapture(e);
      if (scrolling) return;
      e.preventDefault();
      e.stopPropagation();
      armSelectorGhostClickGuard();
      onSelect();
    },
    onPointerCancel: (e) => {
      releaseCapture(e);
      scrolling = false;
    },
  };
}

export function bindSelectorSheetTapSelect(
  onSelect: () => void,
): SheetTapSelectHandlers & { sheetTapSelect: true } {
  return { ...createSelectorSheetTapSelectHandlers(onSelect), sheetTapSelect: true };
}
