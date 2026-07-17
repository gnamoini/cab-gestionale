import assert from "node:assert/strict";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  SELECTOR_SHEET_TAP_SLOP_PX,
  createSelectorSheetTapSelectHandlers,
} from "@/lib/selector-interaction/selector-sheet-tap-select";

let selected = false;
const handlers = createSelectorSheetTapSelectHandlers(() => {
  selected = true;
});

let capturedPointerId: number | null = null;

function pe(
  type: string,
  x: number,
  y: number,
  opts: { preventDefault?: () => void; stopPropagation?: () => void; pointerId?: number } = {},
) {
  const pointerId = opts.pointerId ?? 1;
  const target = {
    setPointerCapture: (id: number) => {
      capturedPointerId = id;
    },
    releasePointerCapture: (id: number) => {
      if (capturedPointerId === id) capturedPointerId = null;
    },
    hasPointerCapture: (id: number) => capturedPointerId === id,
  };
  return {
    type,
    clientX: x,
    clientY: y,
    pointerId,
    currentTarget: target,
    preventDefault: opts.preventDefault ?? (() => {}),
    stopPropagation: opts.stopPropagation ?? (() => {}),
  } as unknown as ReactPointerEvent;
}

selected = false;
capturedPointerId = null;
handlers.onPointerDown(pe("pointerdown", 10, 10));
assert.equal(capturedPointerId, 1, "pointerdown captures pointer");
handlers.onPointerUp(pe("pointerup", 10, 10));
assert.equal(selected, true, "tap without movement selects");
assert.equal(capturedPointerId, null, "pointerup releases capture");

selected = false;
handlers.onPointerDown(pe("pointerdown", 10, 10));
handlers.onPointerMove(pe("pointermove", 10, 10 + SELECTOR_SHEET_TAP_SLOP_PX + 1));
handlers.onPointerUp(pe("pointerup", 10, 10 + SELECTOR_SHEET_TAP_SLOP_PX + 1));
assert.equal(selected, false, "scroll gesture does not select");

selected = false;
handlers.onPointerDown(pe("pointerdown", 20, 20));
handlers.onPointerCancel(pe("pointercancel", 20, 20));
handlers.onPointerUp(pe("pointerup", 20, 20));
assert.equal(selected, true, "cancel resets scroll flag");

console.log("selector-sheet-tap-select.test.ts OK");
