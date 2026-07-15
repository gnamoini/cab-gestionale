import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  backdropOpacityForEdgeOpen,
  clampEdgeOpenDragX,
  panelTransformForEdgeOpen,
  peakEdgeOpenDragX,
  resolveEdgeZonePx,
  shouldCommitEdgeOpen,
  shouldCommitEdgeOpenGesture,
} from "@/lib/ui/use-swipe-from-edge-to-open";

const root = process.cwd();

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

assert.equal(peakEdgeOpenDragX(40, 180), 180);
assert.equal(shouldCommitEdgeOpenGesture(40, 180, 320), true);
assert.equal(clampEdgeOpenDragX(400, 320), 320);
assert.equal(clampEdgeOpenDragX(-10, 320), 0);

const swipeOpenSrc = readFileSync(join(root, "lib/ui/use-swipe-from-edge-to-open.ts"), "utf8");
assert.match(swipeOpenSrc, /isSwipeNavGestureBlockedTarget/);
assert.doesNotMatch(swipeOpenSrc, /touch\.clientX > edgeZone/);
assert.match(swipeOpenSrc, /keepListening/);
assert.match(swipeOpenSrc, /panelWidthLockedRef/);
assert.match(swipeOpenSrc, /peakDragXRef/);
assert.doesNotMatch(swipeOpenSrc, /setSnapTarget\("open"\)/);

const appShellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");
assert.match(appShellSrc, /enabled: isCompactShell && !mobileOpen && !overlayActive/);
assert.doesNotMatch(appShellSrc, /!edgeOpening && !overlayActive/);
assert.match(appShellSrc, /cab-nav-drawer-open-settled/);

console.log("use-swipe-from-edge-to-open.test.ts ok");
