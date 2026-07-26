import { attachConsoleGuards } from "../helpers/console";
import { auditHorizontalOverflow } from "../helpers/horizontal-overflow";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

const MOBILE_ROUTES = ["/dashboard", "/lavorazioni", "/magazzino", "/dipendenti", "/mezzi", "/preventivi", "/fatturazione"] as const;
const LIST_SURFACE_COOKIE = "gestionale-list-surface";

async function setListSurfaceCookie(page: Page, surface: "table" | "cards") {
  const baseUrl = new URL(page.url() === "about:blank" ? "http://127.0.0.1:3000" : page.url());
  await page.context().addCookies([
    {
      name: LIST_SURFACE_COOKIE,
      value: surface,
      domain: baseUrl.hostname,
      path: "/",
    },
  ]);
}

async function listTableMounted(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.querySelector(".gestionale-list-table-scope table"));
}

async function gotoLavorazioniTableReady(page: Page) {
  await page.goto("/lavorazioni");
  await expect(page.locator("main").getByText("Lavorazioni in corso", { exact: false })).toBeVisible({
    timeout: 60_000,
  });
}

async function gotoMagazzinoTableReady(page: Page) {
  await page.goto("/magazzino");
  await expect(page.locator("main").getByText("Magazzino ricambi", { exact: false })).toBeVisible({
    timeout: 60_000,
  });
}

for (const route of MOBILE_ROUTES) {
  test(`mobile ${route} main has no horizontal overflow`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await page.goto(route);

    const overflow = await auditHorizontalOverflow(page);

    expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  });
}

const CURSOR_PREVIEW_VIEWPORTS = [
  { width: 724, height: 900, label: "724" },
  { width: 900, height: 900, label: "900" },
  { width: 1362, height: 900, label: "1362" },
] as const;

for (const vp of CURSOR_PREVIEW_VIEWPORTS) {
  for (const route of MOBILE_ROUTES) {
    test(`${route} has no horizontal overflow at ${vp.label}px`, async ({ page }) => {
      test.setTimeout(90_000);
      attachConsoleGuards(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginViaUi(page, adminCredentials());
      await page.goto(route);
      await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 60_000 });

      const overflow = await auditHorizontalOverflow(page);
      expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
    });
  }
}

test("lavorazioni list: cards cookie on mobile viewport", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await setListSurfaceCookie(page, "cards");
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  expect(await listTableMounted(page)).toBe(false);
});

test("magazzino list: cards cookie on mobile viewport", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await setListSurfaceCookie(page, "cards");
  await loginViaUi(page, adminCredentials());
  await gotoMagazzinoTableReady(page);

  expect(await listTableMounted(page)).toBe(false);
});

test("magazzino list: narrow container on wide viewport keeps table without shell overflow", async ({
  page,
}) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await setListSurfaceCookie(page, "table");
  await loginViaUi(page, adminCredentials());
  await gotoMagazzinoTableReady(page);

  await page.evaluate(() => {
    const root = document.querySelector(".gestionale-list-container, .magazzino-scroll-scope");
    if (root instanceof HTMLElement) {
      root.style.width = "600px";
      root.style.maxWidth = "600px";
    }
  });

  expect(await listTableMounted(page)).toBe(true);
  const overflow = await auditHorizontalOverflow(page);
  expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
});

test("lavorazioni list: table cookie on desktop viewport", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await setListSurfaceCookie(page, "table");
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  expect(await listTableMounted(page)).toBe(true);
});

test("lavorazioni list: 724px preview has no horizontal shell overflow", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 724, height: 900 });
  await setListSurfaceCookie(page, "cards");
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  const overflow = await auditHorizontalOverflow(page);
  expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
});

test("lavorazioni list: narrow container on wide viewport keeps table without shell overflow", async ({
  page,
}) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await setListSurfaceCookie(page, "table");
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  await page.evaluate(() => {
    const root = document.querySelector(".gestionale-list-container, .lavorazioni-scroll-scope");
    if (root instanceof HTMLElement) {
      root.style.width = "600px";
      root.style.maxWidth = "600px";
    }
  });

  expect(await listTableMounted(page)).toBe(true);
  const overflow = await auditHorizontalOverflow(page);
  expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
});
