import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  backdropOpacityForEdgeOpen,
  clampEdgeOpenDragX,
  panelTransformForEdgeOpen,
  peakEdgeOpenDragX,
  peakGestureVelocity,
  resolveEdgeZonePx,
  shouldCommitEdgeOpen,
  shouldCommitEdgeOpenGesture,
} from "@/lib/ui/use-swipe-from-edge-to-open";

const root = process.cwd();

assert.equal(resolveEdgeZonePx(0, 100), 20);
assert.equal(resolveEdgeZonePx(12, 100), 32);
assert.equal(resolveEdgeZonePx(0, 390), 70.2);

assert.equal(panelTransformForEdgeOpen(0, 320), "translate3d(-320px, 0, 0)");
assert.equal(panelTransformForEdgeOpen(160, 320), "translate3d(-160px, 0, 0)");

assert.equal(backdropOpacityForEdgeOpen(0, 320), 0);
assert.equal(backdropOpacityForEdgeOpen(160, 320), 0.5);

assert.equal(shouldCommitEdgeOpen(95, 320), false);
assert.equal(shouldCommitEdgeOpen(96, 320), true);

assert.equal(peakEdgeOpenDragX(40, 180), 180);
assert.equal(shouldCommitEdgeOpenGesture(40, 180, 320), true);
assert.equal(clampEdgeOpenDragX(400, 320), 320);
assert.equal(peakGestureVelocity(0.2, 0.6), 0.6);
assert.equal(peakGestureVelocity(0.8, 0.3), 0.8);

const swipeOpenSrc = readFileSync(join(root, "lib/ui/use-swipe-from-edge-to-open.ts"), "utf8");
assert.match(swipeOpenSrc, /shouldNavDrawerClaimEdgeSwipe/);
assert.match(swipeOpenSrc, /usePointerGesture/);
assert.match(swipeOpenSrc, /requestAnimationFrame/);
assert.match(swipeOpenSrc, /onSnapClosed\?\.\(\)/);
assert.doesNotMatch(
  swipeOpenSrc,
  /finishCancel[\s\S]{0,120}resetDrag\(\)/,
  "finishCancel must not reset compositor before parent consumes visual close",
);
assert.match(swipeOpenSrc, /setPointerCapture/);
assert.match(swipeOpenSrc, /releasePointerCapture/);
assert.match(swipeOpenSrc, /lostpointercapture/);
assert.match(swipeOpenSrc, /e\.target\s*!==\s*document\.body/);
assert.match(swipeOpenSrc, /NAV_DRAWER_EDGE_DRAG_IDLE_MS/);
assert.match(swipeOpenSrc, /useLayoutEffect[\s\S]{0,200}isSnapping/);
assert.match(swipeOpenSrc, /enabled:\s*enabled\s*\|\|\s*edgeActive/);
assert.doesNotMatch(
  swipeOpenSrc,
  /if \(currentX > 0\) \{[\s\S]{0,80}scheduleTransform\(0/,
  "snap-back transform must be deferred to useLayoutEffect, not onGestureEnd",
);
assert.match(swipeOpenSrc, /armSelectorGhostClickGuard/);
assert.match(
  swipeOpenSrc,
  /finishCommit[\s\S]{0,120}armSelectorGhostClickGuard/,
  "finishCommit must arm ghost-click guard before onCommit",
);

const appShellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");
assert.match(appShellSrc, /useNavDrawerMachine/);
assert.match(appShellSrc, /flags\.canEdgeSwipe/);
assert.match(appShellSrc, /onSnapClosed/);
assert.match(appShellSrc, /edgeResetDrag=\{edgeSwipe\.resetDrag\}/);

const sidebarSrc = readFileSync(join(root, "components/gestionale/app-shell-sidebar.tsx"), "utf8");
assert.match(sidebarSrc, /NAV_DRAWER_PANEL_ID/);
assert.match(sidebarSrc, /aria-live/);
assert.match(sidebarSrc, /DISMISS_DRAG_END_COMMIT/);
assert.match(sidebarSrc, /skipCssCloseAnim/);
assert.match(
  sidebarSrc,
  /flags\.state === "OPEN" \|\| \(flags\.state === "DRAGGING" && edgeOpening\)/,
);

console.log("use-swipe-from-edge-to-open.test.ts ok");
