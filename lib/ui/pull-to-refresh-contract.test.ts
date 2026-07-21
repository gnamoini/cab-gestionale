import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
const { window } = dom;
(globalThis as typeof globalThis & { HTMLElement?: typeof HTMLElement }).HTMLElement = window.HTMLElement;
(globalThis as typeof globalThis & { Element?: typeof Element }).Element = window.Element;

import {
  CAB_SCROLLPORT_ATTR,
  isScrollAtTop,
  isVerticalPullGesture,
  pullProgress,
  PTR_COMMIT_PX,
  PTR_MAX_PULL_PX,
  resolvePullScrollport,
  rubberBandPullY,
  shouldCommitPullToRefresh,
} from "@/lib/ui/pull-to-refresh-contract";

assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX - 1), false);
assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX), true);
assert.equal(shouldCommitPullToRefresh(PTR_COMMIT_PX + 40), true);

assert.equal(rubberBandPullY(40), 40);
assert.equal(rubberBandPullY(PTR_MAX_PULL_PX), PTR_MAX_PULL_PX);
assert.ok(rubberBandPullY(PTR_MAX_PULL_PX + 100) > PTR_MAX_PULL_PX);
assert.ok(rubberBandPullY(PTR_MAX_PULL_PX + 100) <= PTR_MAX_PULL_PX + 24);

assert.equal(isVerticalPullGesture(10, 20), true);
assert.equal(isVerticalPullGesture(20, 10), false);
assert.equal(isVerticalPullGesture(0, -5), false);

assert.equal(pullProgress(0), 0);
assert.equal(pullProgress(PTR_COMMIT_PX / 2), 0.5);
assert.equal(pullProgress(PTR_COMMIT_PX), 1);
assert.equal(pullProgress(PTR_COMMIT_PX * 2), 1);

assert.equal(isScrollAtTop(0), true);
assert.equal(isScrollAtTop(1), true);
assert.equal(isScrollAtTop(2), false);

const layoutDom = new JSDOM(
  `<main id="main"><div ${CAB_SCROLLPORT_ATTR} id="sp" style="overflow-y:auto;height:100px"><button id="btn">x</button></div></main>`,
);
const layoutWindow = layoutDom.window;
const main = layoutWindow.document.getElementById("main") as HTMLElement;
const btn = layoutWindow.document.getElementById("btn") as HTMLElement;
const sp = layoutWindow.document.getElementById("sp") as HTMLElement;
Object.defineProperty(sp, "scrollHeight", { value: 200, configurable: true });
Object.defineProperty(sp, "clientHeight", { value: 100, configurable: true });
layoutWindow.getComputedStyle = () =>
  ({
    overflowY: "auto",
    overflow: "visible",
  }) as CSSStyleDeclaration;
assert.equal(resolvePullScrollport(btn, main).id, "sp");
assert.equal(resolvePullScrollport(main, main).id, "main");

console.log("pull-to-refresh-contract.test.ts OK");
