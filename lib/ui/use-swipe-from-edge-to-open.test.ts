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

const swipeOpenSrc = readFileSync(join(root, "lib/ui/use-swipe-from-edge-to-open.ts"), "utf8");
assert.match(swipeOpenSrc, /shouldNavDrawerClaimEdgeSwipe/);
assert.match(swipeOpenSrc, /usePointerGesture/);
assert.match(swipeOpenSrc, /requestAnimationFrame/);

const appShellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");
assert.match(appShellSrc, /useNavDrawerMachine/);
assert.match(appShellSrc, /flags\.canEdgeSwipe/);

const sidebarSrc = readFileSync(join(root, "components/gestionale/app-shell-sidebar.tsx"), "utf8");
assert.match(sidebarSrc, /NAV_DRAWER_PANEL_ID/);
assert.match(sidebarSrc, /aria-live/);

console.log("use-swipe-from-edge-to-open.test.ts ok");
