import type { PointerEvent as ReactPointerEvent } from "react";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";

/** ponytail: slop fisso px — upgrade path: pointer-type aware slop da platform. */
export const SELECTOR_SHEET_TAP_SLOP_PX = 10;

type SheetTapSelectHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: () => void;
};

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
      if (scrolling) return;
      e.preventDefault();
      e.stopPropagation();
      armSelectorGhostClickGuard();
      onSelect();
    },
    onPointerCancel: () => {
      scrolling = false;
    },
  };
}

export function bindSelectorSheetTapSelect(
  onSelect: () => void,
): SheetTapSelectHandlers & { sheetTapSelect: true } {
  return { ...createSelectorSheetTapSelectHandlers(onSelect), sheetTapSelect: true };
}
