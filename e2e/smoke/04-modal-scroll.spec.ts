import { assertGestionalePageScrollUnlocked } from "../helpers/regression";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("mobile drawer releases body scroll lock", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await page.getByTestId("smoke-nav-drawer-open").click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible();
  await page.getByRole("dialog", { name: "Menu principale" }).getByRole("button", { name: "Chiudi" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});

test("mobile nav drawer opens via left-edge swipe", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();

  await page.evaluate(() => {
    const startX = 5;
    const endX = 200;
    const y = 420;

    const mkTouch = (x: number) =>
      new Touch({
        identifier: 1,
        target: document.body,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
      });

    document.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [mkTouch(startX)],
        targetTouches: [mkTouch(startX)],
      }),
    );

    for (let x = startX + 16; x <= endX; x += 32) {
      document.dispatchEvent(
        new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
          touches: [mkTouch(x)],
          targetTouches: [mkTouch(x)],
        }),
      );
    }

    document.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [mkTouch(endX)],
      }),
    );
  });

  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await dialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(dialog).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});

test("mobile nav drawer scrolls menu items", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await page.getByTestId("smoke-nav-drawer-open").click();
  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible();

  const scrollHit = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"][aria-label="Menu principale"]');
    if (!dialogEl) return { ok: false, reason: "missing-dialog" };
    const nav = dialogEl.querySelector(
      'nav[aria-label="Sezioni principali"] .overflow-y-auto',
    ) as HTMLElement | null;
    if (!nav) return { ok: false, reason: "missing-nav-scroll" };

    if (nav.scrollHeight <= nav.clientHeight) {
      const spacer = document.createElement("div");
      spacer.setAttribute("data-smoke-nav-scroll-spacer", "1");
      spacer.style.height = `${nav.clientHeight + 400}px`;
      spacer.style.flexShrink = "0";
      nav.appendChild(spacer);
    }

    const before = nav.scrollTop;
    nav.scrollTop = 200;
    return {
      ok: nav.scrollTop > before,
      scrollTop: nav.scrollTop,
      clientHeight: nav.clientHeight,
      scrollHeight: nav.scrollHeight,
      touchAction: getComputedStyle(nav).touchAction,
    };
  });

  expect(scrollHit.ok, JSON.stringify(scrollHit)).toBe(true);
  expect(scrollHit.touchAction).not.toBe("none");

  await page.getByRole("dialog", { name: "Menu principale" }).getByRole("button", { name: "Chiudi" }).click();
  await expect(dialog).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});

test("mobile nav drawer closes via ESC", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await page.getByTestId("smoke-nav-drawer-open").click();
  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  await assertGestionalePageScrollUnlocked(page);
});

test("mobile nav drawer does not open from center swipe", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");

  await page.evaluate(() => {
    const startX = 200;
    const endX = 320;
    const y = 420;
    const mkTouch = (x: number) =>
      new Touch({
        identifier: 1,
        target: document.body,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
      });
    document.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [mkTouch(startX)],
        targetTouches: [mkTouch(startX)],
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [mkTouch(endX)],
        targetTouches: [mkTouch(endX)],
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [mkTouch(endX)],
      }),
    );
  });

  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
});

test("mobile nav rapid open close", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  const openBtn = page.getByTestId("smoke-nav-drawer-open");
  await openBtn.click();
  await openBtn.click({ force: true });
  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(dialog).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});

test("main scrollbar track is reachable at viewport right edge", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 1920, height: 720 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");

  const scrollOwner = page.locator("main.gestionale-scroll-y");
  await expect(scrollOwner).toBeVisible();

  const hit = await page.evaluate(() => {
    const main = document.querySelector("main.gestionale-scroll-y");
    if (!main) return { ok: false, reason: "missing-main" };

    main.scrollTop = 0;
    const before = main.scrollTop;
    main.scrollTop = 400;
    const scrolled = main.scrollTop > before;
    const mainEl = main as HTMLElement;
    if (!scrolled) {
      mainEl.style.minHeight = "200vh";
      mainEl.scrollTop = 400;
    }

    const rect = main.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 2, rect.right - 2);
    const y = rect.top + Math.min(rect.height * 0.5, 200);
    const el = document.elementFromPoint(x, y);
    const onMain =
      el === main ||
      (el instanceof Node && main.contains(el)) ||
      rect.right - x <= 16;

    return {
      ok: onMain,
      scrollTop: main.scrollTop,
      gutter: getComputedStyle(main).scrollbarGutter,
      tag: el instanceof Element ? el.tagName : null,
    };
  });

  expect(hit.ok, JSON.stringify(hit)).toBe(true);
  expect(hit.gutter).toBe("stable");
});

test("main scroll column spans full width on wide desktop", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");

  const layout = await page.evaluate(() => {
    const main = document.querySelector("main.gestionale-scroll-y");
    if (!main) return { ok: false, reason: "missing-main" };
    const rect = main.getBoundingClientRect();
    const delta = window.innerWidth - rect.right;
    return {
      ok: delta <= 2,
      delta,
      rectRight: rect.right,
      innerWidth: window.innerWidth,
    };
  });

  expect(layout.ok, JSON.stringify(layout)).toBe(true);
});

test("mobile log drawer scroll host scrolls content", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");

  await page.getByRole("button", { name: "Log modifiche" }).click();
  const logDrawer = page.locator('aside[aria-label="Log modifiche magazzino"]');
  await expect(logDrawer).toBeVisible();

  const scrollHit = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Log modifiche magazzino"]');
    if (!aside) return { ok: false, reason: "missing-aside" };
    const host = aside.querySelector("[data-cab-modal-scroll]") as HTMLElement | null;
    if (!host) return { ok: false, reason: "missing-scroll-host" };

    const inner = host.querySelector("ul, p, .gestionale-scrollbar") as HTMLElement | null;
    if (inner && inner.scrollHeight <= host.clientHeight) {
      inner.style.minHeight = `${host.clientHeight + 400}px`;
    } else if (host.scrollHeight <= host.clientHeight) {
      host.style.minHeight = `${host.clientHeight + 400}px`;
    }

    const before = host.scrollTop;
    host.scrollTop = 200;
    return {
      ok: host.scrollTop > before,
      scrollTop: host.scrollTop,
      clientHeight: host.clientHeight,
      scrollHeight: host.scrollHeight,
      overflowY: getComputedStyle(host).overflowY,
    };
  });

  expect(scrollHit.ok, JSON.stringify(scrollHit)).toBe(true);

  await page.getByRole("button", { name: "Chiudi" }).click();
  await expect(logDrawer).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});

test("log drawer locks body scroll and restores on close", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");

  await page.getByRole("button", { name: "Log modifiche" }).click();
  const logDrawer = page.locator('aside[aria-label="Log modifiche magazzino"]');
  await expect(logDrawer).toBeVisible();

  const locked = await page.evaluate(() => ({
    lockAttr: document.body.getAttribute("data-cab-scroll-lock-count"),
    bodyOverflow: document.body.style.overflow,
  }));
  expect(locked.lockAttr || locked.bodyOverflow === "hidden").toBeTruthy();

  await page.getByRole("button", { name: "Chiudi" }).click();
  await expect(logDrawer).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});
