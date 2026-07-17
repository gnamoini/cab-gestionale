import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGestureOwner, shouldNavDrawerClaimEdgeSwipe } from "@/lib/ui/gesture-arbitration";

const root = process.cwd();
const src = readFileSync(join(root, "lib/ui/gesture-arbitration.ts"), "utf8");

assert.match(src, /resolveGestureOwner/);
assert.match(src, /shouldNavDrawerClaimEdgeSwipe/);
assert.match(src, /shouldNavDrawerClaimDismiss/);
assert.match(src, /isSwipeNavGestureBlockedTarget/);
assert.match(src, /resolveActivationZonePx/);

const stub = { closest: () => null } as unknown as Element;
assert.equal(
  resolveGestureOwner({
    target: stub,
    clientX: 10,
    clientY: 0,
    drawerState: "CLOSED",
    overlayActive: false,
    keyboardOpen: false,
    viewportWidth: 390,
  }),
  "pageScroll",
);
assert.equal(
  shouldNavDrawerClaimEdgeSwipe({
    target: stub,
    clientX: 300,
    clientY: 0,
    drawerState: "CLOSED",
    overlayActive: false,
    keyboardOpen: false,
    viewportWidth: 390,
  }),
  false,
);

console.log("gesture-arbitration.test.ts ok");
