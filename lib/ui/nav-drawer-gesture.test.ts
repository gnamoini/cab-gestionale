import assert from "node:assert/strict";
import { resolveActivationZonePx } from "@/lib/ui/mobile-nav-drawer-contract";
import {
  backdropOpacityForClose,
  backdropOpacityForOpen,
  classifyGestureIntent,
  clampCloseDragX,
  clampOpenDragX,
  isInEdgeZone,
  isMultiPointerActive,
  isTapGesture,
  panelTransformClose,
  panelTransformOpen,
  resolveEdgeZonePx,
  shouldActivateHorizontalDrag,
} from "@/lib/ui/nav-drawer-gesture";

assert.equal(resolveActivationZonePx({ safeAreaLeftPx: 0 }), 24);
assert.equal(resolveActivationZonePx({ safeAreaLeftPx: 20 }), 44);
assert.equal(resolveActivationZonePx({ overridePx: 32, safeAreaLeftPx: 0 }), 32);
assert.equal(resolveEdgeZonePx({ safeAreaLeftPx: 0 }), 24);

assert.equal(isInEdgeZone(23, 24), true);
assert.equal(isInEdgeZone(24, 24), true);
assert.equal(isInEdgeZone(25, 24), false);

assert.equal(panelTransformOpen(0, 320), "translate3d(-320px, 0, 0)");
assert.equal(panelTransformOpen(160, 320), "translate3d(-160px, 0, 0)");
assert.equal(panelTransformClose(-80), "translate3d(-80px, 0, 0)");

assert.equal(backdropOpacityForOpen(0, 320), 0);
assert.equal(backdropOpacityForOpen(160, 320), 0.5);
assert.equal(backdropOpacityForClose(-160, 320), 0.5);

assert.equal(clampOpenDragX(400, 320), 320);
assert.equal(clampCloseDragX(10, 320), 0);
assert.equal(clampCloseDragX(-400, 320), -320);

assert.equal(classifyGestureIntent(5, 5), "pending");
assert.equal(classifyGestureIntent(80, 10), "horizontal");
assert.equal(classifyGestureIntent(10, 80), "vertical");

assert.equal(isTapGesture(3, 4), true);
assert.equal(isTapGesture(20, 0), false);

assert.equal(shouldActivateHorizontalDrag("open", true, 80, 10), true);
assert.equal(shouldActivateHorizontalDrag("open", true, 80, 120), false);
assert.equal(shouldActivateHorizontalDrag("close", false, -80, 10), true);
assert.equal(shouldActivateHorizontalDrag("close", false, 80, 10), false);

assert.equal(isMultiPointerActive(1), false);
assert.equal(isMultiPointerActive(2), true);

console.log("nav-drawer-gesture.test.ts ok");
