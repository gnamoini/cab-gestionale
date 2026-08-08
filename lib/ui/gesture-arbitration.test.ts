import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import {
  resolveGestureOwner,
  shouldNavDrawerClaimDismiss,
  shouldNavDrawerClaimEdgeSwipe,
} from "@/lib/ui/gesture-arbitration";
import { NAV_DRAWER_PANEL_ID } from "@/lib/ui/mobile-nav-drawer-contract";

const root = process.cwd();
const src = readFileSync(join(root, "lib/ui/gesture-arbitration.ts"), "utf8");

assert.match(src, /resolveGestureOwner/);
assert.match(src, /shouldNavDrawerClaimEdgeSwipe/);
assert.match(src, /shouldNavDrawerClaimDismiss/);
assert.match(src, /isSwipeNavGestureBlockedTarget/);
assert.match(src, /resolveActivationZonePx/);
assert.doesNotMatch(src, /canPullToRefreshClaimGesture/);
assert.doesNotMatch(src, /pull-to-refresh/);

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
  shouldNavDrawerClaimEdgeSwipe({
    ...baseCtx,
    clientX: 5,
    target: tableCell,
  }),
  true,
  "edge zone swipe must claim over horizontal-scroll table cell",
);

assert.equal(
  shouldNavDrawerClaimEdgeSwipe({
    ...baseCtx,
    clientX: 200,
    target: tableCell,
  }),
  false,
  "center swipe over table must not claim nav drawer",
);

const ignored = document.createElement("div");
ignored.setAttribute("data-cab-swipe-nav-ignore", "");
tableWrap.appendChild(ignored);
assert.equal(
  shouldNavDrawerClaimEdgeSwipe({
    ...baseCtx,
    clientX: 5,
    target: ignored,
  }),
  false,
  "explicit opt-out in edge zone must block",
);

const panel = document.createElement("div");
panel.id = NAV_DRAWER_PANEL_ID;
const input = document.createElement("input");
panel.appendChild(input);
document.body.appendChild(panel);

assert.equal(
  shouldNavDrawerClaimDismiss({
    ...baseCtx,
    clientX: 100,
    drawerState: "OPEN",
    target: input,
  }),
  false,
  "dismiss must not claim on input inside panel",
);

assert.equal(
  shouldNavDrawerClaimDismiss({
    ...baseCtx,
    clientX: 100,
    drawerState: "OPEN",
    target: panel,
  }),
  true,
  "dismiss must claim on panel surface",
);

console.log("gesture-arbitration.test.ts ok");
