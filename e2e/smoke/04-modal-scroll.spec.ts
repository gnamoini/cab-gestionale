import { assertNoBodyScrollLock } from "../helpers/regression";
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
  await page.getByRole("button", { name: "Chiudi menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  await assertNoBodyScrollLock(page);
});

test("main scrollbar track is reachable at viewport right edge", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 1280, height: 720 });
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
  await assertNoBodyScrollLock(page);
});
