import assert from "node:assert/strict";
import {
  SELECTOR_SHEET_TAP_SLOP_PX,
  createSelectorSheetTapSelectHandlers,
} from "@/lib/selector-interaction/selector-sheet-tap-select";

let selected = false;
const handlers = createSelectorSheetTapSelectHandlers(() => {
  selected = true;
});

function pe(type: string, x: number, y: number, opts: { preventDefault?: () => void; stopPropagation?: () => void } = {}) {
  return {
    type,
    clientX: x,
    clientY: y,
    preventDefault: opts.preventDefault ?? (() => {}),
    stopPropagation: opts.stopPropagation ?? (() => {}),
  } as {
    type: string;
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    stopPropagation: () => void;
  };
}

selected = false;
handlers.onPointerDown(pe("pointerdown", 10, 10));
handlers.onPointerUp(pe("pointerup", 10, 10));
assert.equal(selected, true, "tap without movement selects");

selected = false;
handlers.onPointerDown(pe("pointerdown", 10, 10));
handlers.onPointerMove(pe("pointermove", 10, 10 + SELECTOR_SHEET_TAP_SLOP_PX + 1));
handlers.onPointerUp(pe("pointerup", 10, 10 + SELECTOR_SHEET_TAP_SLOP_PX + 1));
assert.equal(selected, false, "scroll gesture does not select");

selected = false;
handlers.onPointerDown(pe("pointerdown", 20, 20));
handlers.onPointerCancel();
handlers.onPointerUp(pe("pointerup", 20, 20));
assert.equal(selected, true, "cancel resets scroll flag");

console.log("selector-sheet-tap-select.test.ts OK");
