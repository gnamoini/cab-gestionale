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

  const salva = modal.getByRole("button", { name: /^salva/i });
  await salva.click();

  await expect(modal).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(codice, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
}
