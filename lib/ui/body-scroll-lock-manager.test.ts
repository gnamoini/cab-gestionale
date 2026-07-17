/**
 * Scroll-lock main compensation — policy + jsdom smoke.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  MAIN_SCROLL_LOCK_ATTR,
  SCROLL_LOCK_GAP_VAR,
  acquireBodyScrollLock,
  acquireMainScrollLock,
  forceReleaseAllBodyScrollLocks,
  getBodyScrollLockCount,
  isGestionaleMainScrollLockActive,
} from "./body-scroll-lock-manager";

const ROOT = process.cwd();
const globalsCoreCss = fs.readFileSync(path.join(ROOT, "app/globals-core.css"), "utf8");
const managerSrc = fs.readFileSync(path.join(ROOT, "lib/ui/body-scroll-lock-manager.ts"), "utf8");
const shellLayoutSrc = fs.readFileSync(path.join(ROOT, "lib/ui/gestionale-shell-layout.ts"), "utf8");

assert.match(globalsCoreCss, /main\.gestionale-scroll-y\[data-cab-main-scroll-lock\][\s\S]*scrollbar-gutter:\s*stable/);
assert.match(globalsCoreCss, /data-cab-scroll-lock-fixed-compensate/);
assert.match(globalsCoreCss, /--cab-scroll-lock-gap/);
assert.match(managerSrc, /shouldPadMainForScrollbarLock/);
assert.match(managerSrc, /syncMainScrollbarLockCompensation/);
assert.match(managerSrc, /contentWidthBefore/);
assert.match(shellLayoutSrc, /resolveFrozenMainScrollbarInset/);

function mountShellDom(gutter: "auto" | "stable" = "auto") {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div class="cab-app-shell">
        <main class="gestionale-scroll-y" style="width:400px;height:200px;overflow:auto">
          <div style="height:800px">content</div>
        </main>
      </div>
    </body></html>`,
    { pretendToBeVisual: true },
  );

  const { window } = dom;
  const { document } = window;
  (globalThis as { window?: Window; document?: Document }).window = window as unknown as Window;
  (globalThis as { window?: Window; document?: Document }).document = document;

  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });

  const main = document.querySelector("main.gestionale-scroll-y") as HTMLElement;
  assert.ok(main);

  let clientWidth = 385;
  Object.defineProperty(main, "offsetWidth", { get: () => 400, configurable: true });
  Object.defineProperty(main, "clientWidth", {
    get: () => (main.style.overflow === "hidden" ? 400 : clientWidth),
    configurable: true,
  });
  Object.defineProperty(main, "scrollHeight", { value: 800, configurable: true });
  Object.defineProperty(main, "clientHeight", { value: 200, configurable: true });
  Object.defineProperty(main, "scrollTop", { value: 120, writable: true, configurable: true });

  window.getComputedStyle = ((el: Element) => {
    const gutterValue = el === main ? gutter : "";
    return { scrollbarGutter: gutterValue } as CSSStyleDeclaration;
  }) as typeof window.getComputedStyle;

  return { main };
}

// --- auto gutter: pre-gap padding ---
{
  forceReleaseAllBodyScrollLocks("test-reset");
  const { main } = mountShellDom("auto");
  const release = acquireBodyScrollLock("test-auto");
  assert.equal(getBodyScrollLockCount(), 1);
  assert.equal(main.style.overflow, "hidden");
  assert.equal(main.getAttribute(MAIN_SCROLL_LOCK_ATTR), "test-auto");
  assert.equal(main.style.paddingInlineEnd, "15px");
  release();
}

// --- stable gutter: post-lock delta fallback ---
{
  forceReleaseAllBodyScrollLocks("test-reset");
  const { main } = mountShellDom("stable");
  const release = acquireBodyScrollLock("test-stable");
  assert.equal(main.style.paddingInlineEnd, "15px");
  release();
}

// --- nested body locks: restore only on last release ---
{
  forceReleaseAllBodyScrollLocks("test-reset");
  const { main } = mountShellDom("auto");
  const releaseA = acquireBodyScrollLock("nested-a");
  const releaseB = acquireBodyScrollLock("nested-b");
  assert.equal(getBodyScrollLockCount(), 2);
  assert.equal(main.style.paddingInlineEnd, "15px");
  releaseA();
  assert.equal(getBodyScrollLockCount(), 1);
  assert.equal(main.style.overflow, "hidden");
  assert.equal(main.style.paddingInlineEnd, "15px");
  releaseB();
  assert.equal(getBodyScrollLockCount(), 0);
  assert.equal(main.style.overflow, "auto");
  assert.equal(main.style.paddingInlineEnd, "");
  assert.equal(main.getAttribute(MAIN_SCROLL_LOCK_ATTR), null);
}

// --- main-only lock (nav drawer path) ---
{
  forceReleaseAllBodyScrollLocks("test-reset");
  const { main } = mountShellDom("auto");
  const release = acquireMainScrollLock("nav-drawer");
  assert.equal(isGestionaleMainScrollLockActive(), true);
  assert.equal(main.style.paddingInlineEnd, "15px");
  release();
  assert.equal(isGestionaleMainScrollLockActive(), false);
}

// --- non-shell body gap CSS var ---
{
  forceReleaseAllBodyScrollLocks("test-reset");
  document.body.innerHTML = `<main style="height:200vh">login</main>`;
  Object.defineProperty(document.documentElement, "clientWidth", { value: 385, configurable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", { value: 2400, configurable: true });
  Object.defineProperty(document.documentElement, "clientHeight", { value: 800, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
  const release = acquireBodyScrollLock("login");
  assert.equal(document.body.style.paddingRight, "15px");
  assert.equal(document.documentElement.style.getPropertyValue(SCROLL_LOCK_GAP_VAR), "15px");
  release();
  assert.equal(document.documentElement.style.getPropertyValue(SCROLL_LOCK_GAP_VAR), "");
}

forceReleaseAllBodyScrollLocks("test-cleanup");

console.log("body-scroll-lock-manager.test.ts OK");
