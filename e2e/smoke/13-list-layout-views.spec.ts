import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

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
  { path: "/bunder", readyText: "Bunder" },
];

async function getGestionaleListLayoutMode(page: Page): Promise<"desktop" | "mobile" | "unknown"> {
  return page.evaluate(() => {
    const root = document.querySelector(".gestionale-list-layout-desktop, .gestionale-list-layout-mobile");
    if (root?.classList.contains("gestionale-list-layout-mobile")) return "mobile";
    if (root?.classList.contains("gestionale-list-layout-desktop")) return "desktop";
    return "unknown";
  });
}

async function listTableMounted(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.querySelector(".gestionale-list-table-scope table"));
}

async function gotoListRouteReady(page: Page, route: ListLayoutRoute) {
  await page.goto(route.path);
  await expect(page.getByText(route.readyText, { exact: false })).toBeVisible({
    timeout: 60_000,
  });
}

async function narrowLayoutContainer(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector(
      ".gestionale-list-layout-desktop, .gestionale-list-layout-mobile",
    );
    if (root instanceof HTMLElement) {
      root.style.width = "600px";
      root.style.maxWidth = "600px";
    }
  });
}

for (const route of XL_LIST_ROUTES) {
  test(`list layout ${route.path}: mobile viewport shows mobile branch`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
    expect(await listTableMounted(page)).toBe(false);
  });

  test(`list layout ${route.path}: desktop viewport shows desktop branch`, async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    expect(await getGestionaleListLayoutMode(page)).toBe("desktop");
    expect(await listTableMounted(page)).toBe(true);
  });

  test(`list layout ${route.path}: narrow container on wide viewport shows mobile (IDE preview)`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await gotoListRouteReady(page, route);

    await narrowLayoutContainer(page);

    await expect.poll(async () => getGestionaleListLayoutMode(page)).toBe("mobile");
    expect(await listTableMounted(page)).toBe(false);
  });
}

test("list layout /dipendenti: mobile viewport shows mobile timesheet branch", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoListRouteReady(page, { path: "/dipendenti", readyText: "Tabella presenze" });

  expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
});

test("list layout /dashboard/security: mobile viewport shows user cards", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoListRouteReady(page, { path: "/dashboard/security", readyText: "Utenti" });

  expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
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
