import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { clickNuovaLavorazioneCta } from "../helpers/lavorazioni-scheda";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

type VisibilityHit = {
  ok: boolean;
  labelTop?: number;
  fieldTop?: number;
  fieldBottom?: number;
  visibleTop?: number;
  visibleBottom?: number;
  reason?: string;
};

async function assertFieldFullyVisible(page: import("@playwright/test").Page, labelText: string): Promise<void> {
  const hit = await page.evaluate((label): VisibilityHit => {
    const modal = document.querySelector("[data-cab-modal-root]");
    if (!modal) return { ok: false, reason: "missing-modal-root" };

    const labels = Array.from(modal.querySelectorAll("label, [data-cab-field-label]"));
    const labelEl = labels.find((el) => el.textContent?.includes(label));
    if (!(labelEl instanceof HTMLElement)) return { ok: false, reason: `missing-label:${label}` };

    const container = labelEl.closest("div")?.parentElement ?? labelEl.parentElement;
    const field =
      container?.querySelector("input, textarea, select, [role='combobox']") ??
      labelEl.parentElement?.querySelector("input, textarea, select, [role='combobox']");
    if (!(field instanceof HTMLElement)) return { ok: false, reason: `missing-field:${label}` };

    const labelRect = labelEl.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const vv = window.visualViewport;
    const visibleTop = vv ? vv.offsetTop : 0;
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const header = modal.querySelector("header");
    const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : visibleTop;

    const bandTop = Math.max(visibleTop, headerBottom);
    const ok =
      labelRect.top >= bandTop - 2 &&
      fieldRect.top >= bandTop - 2 &&
      fieldRect.bottom <= visibleBottom + 2;

    return {
      ok,
      labelTop: labelRect.top,
      fieldTop: fieldRect.top,
      fieldBottom: fieldRect.bottom,
      visibleTop: bandTop,
      visibleBottom,
    };
  }, labelText);

  expect(hit.ok, JSON.stringify(hit)).toBe(true);
}

type ListboxVisibilityHit = {
  ok: boolean;
  listboxTop?: number;
  listboxBottom?: number;
  visibleTop?: number;
  visibleBottom?: number;
  reason?: string;
};

async function assertOpenListboxFullyVisible(page: import("@playwright/test").Page): Promise<void> {
  const hit = await page.evaluate((): ListboxVisibilityHit => {
    const listbox = document.querySelector('[role="listbox"]');
    if (!(listbox instanceof HTMLElement)) return { ok: false, reason: "missing-listbox" };

    const rect = listbox.getBoundingClientRect();
    const vv = window.visualViewport;
    const visibleTop = vv ? vv.offsetTop : 0;
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

    const ok =
      rect.height > 0 &&
      rect.width > 0 &&
      rect.top >= visibleTop - 2 &&
      rect.bottom <= visibleBottom + 2;

    return {
      ok,
      listboxTop: rect.top,
      listboxBottom: rect.bottom,
      visibleTop,
      visibleBottom,
    };
  });

  expect(hit.ok, JSON.stringify(hit)).toBe(true);
}

async function mockKeyboardInset(page: import("@playwright/test").Page, insetPx: number): Promise<void> {
  await page.evaluate((inset) => {
    document.documentElement.style.setProperty("--cab-keyboard-inset", `${inset}px`);
    const vv = window.visualViewport;
    if (vv) {
      vv.dispatchEvent(new Event("resize"));
      vv.dispatchEvent(new Event("scroll"));
    }
    window.dispatchEvent(new Event("resize"));
  }, insetPx);
}

test.describe("mobile focus field visibility", () => {
  test.beforeEach(({ page }) => {
    test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
    attachConsoleGuards(page);
  });

  test("scheda ingresso: label e campo visibili dopo focus su mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await clickNuovaLavorazioneCta(page);

    const modal = page.locator("[data-cab-modal-root]").first();
    await expect(modal).toBeVisible();

    await modal.getByLabel(/^Cliente/i).click();
    await assertFieldFullyVisible(page, "Cliente");
  });

  test("scheda ingresso: combobox e data ingresso visibili dopo focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await clickNuovaLavorazioneCta(page);

    const modal = page.locator("[data-cab-modal-root]").first();
    await expect(modal).toBeVisible();

    const cantiere = modal.getByRole("combobox", { name: "Cantiere", exact: true });
    if (await cantiere.isVisible().catch(() => false)) {
      await cantiere.click();
      await assertFieldFullyVisible(page, "Cantiere");
      await assertOpenListboxFullyVisible(page);
      await page.keyboard.press("Escape");
    }

    const dataIngresso = modal.getByLabel("Data ingresso");
    if (await dataIngresso.isVisible().catch(() => false)) {
      await dataIngresso.click();
      await assertFieldFullyVisible(page, "Data ingresso");
    }
  });

  test("scheda ingresso: textarea auto-grow mantiene visibilità", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await clickNuovaLavorazioneCta(page);

    const modal = page.locator("[data-cab-modal-root]").first();
    const note = modal.getByLabel(/Descrizione anomalia/i);
    test.skip(!(await note.isVisible().catch(() => false)), "Campo descrizione non presente");

    await note.click();
    const longText = Array.from({ length: 8 }, (_, i) => `Riga ${i + 1}: testo lungo per auto-grow textarea.`).join(
      "\n",
    );
    await note.fill(longText);
    await page.waitForTimeout(150);
    await assertFieldFullyVisible(page, "Descrizione anomalia");
  });

  test("lavorazioni: filter drawer apre overlay e search resta usabile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await expect(page.getByRole("heading", { name: "Lavorazioni", exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Filtri" }).click();
    const drawer = page.locator("[data-cab-modal-root]").filter({ has: page.getByRole("heading", { name: "Filtri" }) });
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    const search = drawer.getByRole("searchbox").or(drawer.locator('input[type="search"]')).first();
    if (await search.isVisible().catch(() => false)) {
      await search.click();
      await expect(search).toBeFocused();
    }
  });

  test("scheda ingresso: campo visibile con keyboard inset mock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await clickNuovaLavorazioneCta(page);

    const modal = page.locator("[data-cab-modal-root]").first();
    const cliente = modal.getByLabel(/Cliente/i);
    await cliente.click();
    await mockKeyboardInset(page, 280);
    await page.waitForTimeout(100);
    await assertFieldFullyVisible(page, "Cliente");
  });
});
