import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import {
  canPullToRefreshClaimGesture,
  resolveGestureOwner,
  shouldNavDrawerClaimEdgeSwipe,
} from "@/lib/ui/gesture-arbitration";

const root = process.cwd();
const src = readFileSync(join(root, "lib/ui/gesture-arbitration.ts"), "utf8");

assert.match(src, /resolveGestureOwner/);
assert.match(src, /shouldNavDrawerClaimEdgeSwipe/);
assert.match(src, /shouldNavDrawerClaimDismiss/);
assert.match(src, /isSwipeNavGestureBlockedTarget/);
assert.match(src, /resolveActivationZonePx/);
assert.match(src, /canPullToRefreshClaimGesture/);

const stub = { closest: () => null } as unknown as Element;
const baseCtx = {
  clientX: 200,
  clientY: 100,
  drawerState: "CLOSED" as const,
  overlayActive: false,
  keyboardOpen: false,
  viewportWidth: 390,
};

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

assert.equal(canPullToRefreshClaimGesture({ ...baseCtx, target: stub }), true);
assert.equal(
  canPullToRefreshClaimGesture({ ...baseCtx, target: stub, overlayActive: true }),
  false,
);
assert.equal(
  canPullToRefreshClaimGesture({ ...baseCtx, target: stub, drawerState: "OPEN" }),
  false,
);
assert.equal(
  canPullToRefreshClaimGesture({ ...baseCtx, target: stub, drawerState: "DRAGGING" }),
  false,
);

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { pretendToBeVisual: true });
const { document } = dom.window;
const tableWrap = document.createElement("div");
tableWrap.style.overflowX = "auto";
Object.defineProperty(tableWrap, "scrollWidth", { value: 800, configurable: true });
Object.defineProperty(tableWrap, "clientWidth", { value: 320, configurable: true });
const tableCell = document.createElement("td");
tableWrap.appendChild(tableCell);
document.body.appendChild(tableWrap);

assert.equal(
  canPullToRefreshClaimGesture({ ...baseCtx, target: tableCell }),
  true,
  "PTR must be allowed over table cell targets (including inside horizontal-scroll wrappers)",
);

const draggable = document.createElement("div");
draggable.setAttribute("data-cab-draggable", "");
assert.equal(
  canPullToRefreshClaimGesture({ ...baseCtx, target: draggable }),
  false,
);

console.log("gesture-arbitration.test.ts ok");

