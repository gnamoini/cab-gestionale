import { attachConsoleGuards } from "../helpers/console";
import { auditHorizontalOverflow } from "../helpers/horizontal-overflow";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

const MOBILE_ROUTES = ["/dashboard", "/lavorazioni", "/magazzino", "/dipendenti", "/mezzi", "/preventivi", "/fatturazione"] as const;

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

async function gotoLavorazioniTableReady(page: Page) {
  await page.goto("/lavorazioni");
  await expect(page.getByText("Lavorazioni in corso", { exact: false })).toBeVisible({
    timeout: 60_000,
  });
}

async function gotoMagazzinoTableReady(page: Page) {
  await page.goto("/magazzino");
  await expect(page.getByText("Magazzino ricambi", { exact: false })).toBeVisible({
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

test("lavorazioni list: mobile viewport shows cards not desktop table", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
  expect(await listTableMounted(page)).toBe(false);
});

test("magazzino list: mobile viewport shows cards not desktop table", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoMagazzinoTableReady(page);

  expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
  expect(await listTableMounted(page)).toBe(false);
});

test("magazzino list: narrow container on wide viewport shows cards (IDE preview)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoMagazzinoTableReady(page);

  await page.evaluate(() => {
    const root = document.querySelector(
      ".gestionale-list-layout-desktop, .gestionale-list-layout-mobile",
    );
    if (root instanceof HTMLElement) {
      root.style.width = "600px";
      root.style.maxWidth = "600px";
    }
  });

  await expect.poll(async () => getGestionaleListLayoutMode(page)).toBe("mobile");
  expect(await listTableMounted(page)).toBe(false);
});

test("lavorazioni list: desktop viewport shows table not mobile cards", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  expect(await getGestionaleListLayoutMode(page)).toBe("desktop");
  expect(await listTableMounted(page)).toBe(true);
});

test("lavorazioni list: 724px preview has no horizontal shell overflow", async ({ page }) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 724, height: 900 });
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  const overflow = await auditHorizontalOverflow(page);
  expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  expect(await getGestionaleListLayoutMode(page)).toBe("mobile");
});

test("lavorazioni list: narrow container on wide viewport shows cards (IDE preview)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  attachConsoleGuards(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await gotoLavorazioniTableReady(page);

  await page.evaluate(() => {
    const root = document.querySelector(
      ".gestionale-list-layout-desktop, .gestionale-list-layout-mobile",
    );
    if (root instanceof HTMLElement) {
      root.style.width = "600px";
      root.style.maxWidth = "600px";
    }
  });

  await expect.poll(async () => getGestionaleListLayoutMode(page)).toBe("mobile");
  expect(await listTableMounted(page)).toBe(false);
});
