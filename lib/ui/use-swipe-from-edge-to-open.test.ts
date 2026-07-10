import assert from "node:assert/strict";
import {
  backdropOpacityForEdgeOpen,
  panelTransformForEdgeOpen,
  resolveEdgeZonePx,
  shouldCommitEdgeOpen,
} from "@/lib/ui/use-swipe-from-edge-to-open";

assert.equal(resolveEdgeZonePx(0), 20);
assert.equal(resolveEdgeZonePx(12), 20);
assert.equal(resolveEdgeZonePx(34), 34);

assert.equal(panelTransformForEdgeOpen(0, 320), "translateX(-320px)");
assert.equal(panelTransformForEdgeOpen(160, 320), "translateX(-160px)");
assert.equal(panelTransformForEdgeOpen(320, 320), "translateX(0px)");

assert.equal(backdropOpacityForEdgeOpen(0, 320), 0);
assert.equal(backdropOpacityForEdgeOpen(160, 320), 0.5);
assert.equal(backdropOpacityForEdgeOpen(320, 320), 1);
assert.ok(backdropOpacityForEdgeOpen(200, 320) > backdropOpacityForEdgeOpen(100, 320));

assert.equal(shouldCommitEdgeOpen(95, 320), false);
assert.equal(shouldCommitEdgeOpen(96, 320), true);
assert.equal(shouldCommitEdgeOpen(320, 320), true);

console.log("use-swipe-from-edge-to-open.test.ts ok");
