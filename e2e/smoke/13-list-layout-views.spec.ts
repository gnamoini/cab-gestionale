import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const LIST_SURFACE_COOKIE = "gestionale-list-surface";

type ListLayoutRoute = {
  path: string;
  readyText: string;
};

const XL_LIST_ROUTES: ListLayoutRoute[] = [
  { path: "/lavorazioni", readyText: "Lavorazioni in corso" },
  { path: "/mezzi", readyText: "Mezzi" },
  { path: "/magazzino", readyText: "Magazzino" },
  { path: "/preventivi", readyText: "Preventivi" },
  { path: "/lavorazioni-clienti", readyText: "Lavorazioni in corso" },
];

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

async function listCardsMounted(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return false;
    return main.querySelectorAll("[class*='CardMobile'], .gestionale-list-table-scope table").length > 0
      && !document.querySelector(".gestionale-list-table-scope table");
  });
}

async function gotoListRouteReady(page: Page, route: ListLayoutRoute) {
  await page.goto(route.path);
  await expect(page.locator("main").getByText(route.readyText, { exact: false })).toBeVisible({
    timeout: 60_000,
  });
}

for (const route of XL_LIST_ROUTES) {
  test(`list surface ${route.path}: cards cookie on mobile viewport`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await setListSurfaceCookie(page, "cards");
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    expect(await listTableMounted(page)).toBe(false);
    expect(await listCardsMounted(page)).toBe(true);
  });

  test(`list surface ${route.path}: table cookie on desktop viewport`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await setListSurfaceCookie(page, "table");
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    expect(await listTableMounted(page)).toBe(true);
    expect(await listCardsMounted(page)).toBe(false);
  });

  test(`list surface ${route.path}: narrow container keeps table with controlled overflow`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await setListSurfaceCookie(page, "table");
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    await page.evaluate(() => {
      const root = document.querySelector(".gestionale-list-container, .lavorazioni-scroll-scope, .magazzino-scroll-scope");
      if (root instanceof HTMLElement) {
        root.style.width = "600px";
        root.style.maxWidth = "600px";
      }
    });

    expect(await listTableMounted(page)).toBe(true);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return { ok: false };
      return { ok: main.scrollWidth <= main.clientWidth + 4 };
    });
    expect(overflow.ok).toBe(true);
  });
}

test("list surface /dipendenti: cards cookie shows mobile timesheet branch", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await setListSurfaceCookie(page, "cards");
  await loginViaUi(page, adminCredentials());
  await gotoListRouteReady(page, { path: "/dipendenti", readyText: "Tabella presenze" });

  expect(await listTableMounted(page)).toBe(false);
});

test("list surface /sicurezza: cards cookie shows user cards", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await setListSurfaceCookie(page, "cards");
  await loginViaUi(page, adminCredentials());
  await gotoListRouteReady(page, { path: "/sicurezza", readyText: "Utenti" });

  expect(await listTableMounted(page)).toBe(false);
});

const OVERFLOW_ROUTES = ["/report", "/documenti", "/dashboard"] as const;

for (const route of OVERFLOW_ROUTES) {
  test(`mobile ${route} main has no horizontal overflow`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await page.goto(route);

    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return { ok: false, reason: "missing-main" };
      return {
        ok: main.scrollWidth <= main.clientWidth + 2,
        scrollWidth: main.scrollWidth,
        clientWidth: main.clientWidth,
      };
    });

    expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  });
}
