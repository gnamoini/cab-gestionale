import { expect, type Page } from "@playwright/test";

export function uniqueRicambioCodice(prefix = "E2E"): string {
  return `${prefix}-${Date.now()}`;
}

/** Apre modal Nuovo ricambio da /magazzino e compila minimo lenient. */
export async function createRicambioLenientSmoke(
  page: Page,
  codice: string,
): Promise<void> {
  await page.goto("/magazzino");
  await expect(page).toHaveURL(/\/magazzino/);

  const newBtn = page.getByRole("button", { name: /\+?\s*Nuovo(\s+ricambio)?/i });
  await expect(newBtn).toBeVisible({ timeout: 20_000 });
  await newBtn.click();

  const modal = page.getByRole("dialog").filter({ hasText: "Nuovo ricambio" });
  await expect(modal).toBeVisible();

  const codiceInput = modal.getByLabel(/codice fornitore originale/i).first();
  await codiceInput.fill(codice);

  const createResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/rest/v1/magazzino_ricambi") &&
      res.request().method() === "POST" &&
      res.ok(),
    { timeout: 60_000 },
  );

  await modal.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
  });

  await createResponse;
  await expect(modal).toBeHidden({ timeout: 30_000 });

  const row = page.getByText(codice, { exact: false }).first();
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible({ timeout: 20_000 });
}
