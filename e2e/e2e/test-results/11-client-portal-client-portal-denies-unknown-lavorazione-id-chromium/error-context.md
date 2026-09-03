# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 11-client-portal.spec.ts >> client portal denies unknown lavorazione id
- Location: e2e\smoke\11-client-portal.spec.ts:50:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata/i)
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata/i)

```

```yaml
- alert
- region "Attiva notifiche gestionale":
  - paragraph: Attiva le notifiche
  - text: Su questo browser
  - paragraph: Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.
  - button "No, grazie"
  - button "Sì, attiva"
- main:
  - link "Torna a Portale Clienti":
    - /url: /lavorazioni-clienti
  - heading "Portale Clienti" [level=1]
  - paragraph: Dedup in-flight cancelled
  - link "Torna a Portale Clienti":
    - /url: /lavorazioni-clienti
```

# Test source

```ts
  1  | import { attachConsoleGuards } from "../helpers/console";
  2  | import { adminCredentials, clientCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
  3  | import { test, expect } from "@playwright/test";
  4  | 
  5  | /** UUID inesistente — verifica che il portale non esponga dati sensibili. */
  6  | const ALIEN_LAVORAZIONE_ID = "00000000-0000-0000-0000-000000000001";
  7  | 
  8  | test("admin can open client lavorazioni list", async ({ page }) => {
  9  |   attachConsoleGuards(page);
  10 |   await loginViaUi(page, adminCredentials());
  11 |   await page.goto("/lavorazioni-clienti");
  12 |   await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
  13 | });
  14 | 
  15 | test("client portal Contattaci modal shows contact links", async ({ page }) => {
  16 |   attachConsoleGuards(page);
  17 |   await page.setViewportSize({ width: 390, height: 844 });
  18 |   await loginViaUi(page, adminCredentials());
  19 |   await page.goto("/lavorazioni-clienti");
  20 |   await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
  21 | 
  22 |   const openContattaci = page.getByTestId("smoke-contattaci-open").locator("visible=true");
  23 |   await expect(openContattaci).toHaveCount(1);
  24 |   await expect(openContattaci).toBeVisible({ timeout: 30_000 });
  25 |   await openContattaci.click();
  26 | 
  27 |   const dialog = page.getByRole("dialog", { name: "Contattaci" });
  28 |   await expect(dialog).toBeVisible({ timeout: 10_000 });
  29 |   await expect(dialog.getByText("service@autocompattatori.it")).toBeVisible();
  30 |   await expect(dialog.getByText("+39 3480712791")).toBeVisible();
  31 | 
  32 |   await expect(page.getByTestId("smoke-contattaci-call")).toHaveAttribute("href", "tel:+393480712791");
  33 |   await expect(page.getByTestId("smoke-contattaci-whatsapp")).toHaveAttribute(
  34 |     "href",
  35 |     "https://wa.me/393480712791",
  36 |   );
  37 |   await expect(page.getByTestId("smoke-contattaci-email")).toHaveAttribute(
  38 |     "href",
  39 |     "mailto:service@autocompattatori.it",
  40 |   );
  41 | 
  42 |   await expect(dialog.getByRole("button", { name: "Chiudi" })).toHaveCount(1);
  43 |   await expect(dialog.getByTestId("smoke-contattaci-close")).toBeVisible();
  44 | 
  45 |   await dialog.getByTestId("smoke-contattaci-close").click();
  46 |   await expect(dialog).not.toBeVisible();
  47 |   await expect(page).toHaveURL(/lavorazioni-clienti/);
  48 | });
  49 | 
  50 | test("client portal denies unknown lavorazione id", async ({ page }) => {
  51 |   attachConsoleGuards(page);
  52 |   await loginViaUi(page, adminCredentials());
  53 |   await page.goto(`/lavorazioni-clienti/${ALIEN_LAVORAZIONE_ID}`);
  54 |   await expect(
  55 |     page.getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata/i),
> 56 |   ).toBeVisible({ timeout: 30_000 });
     |     ^ Error: expect(locator).toBeVisible() failed
  57 |   await expect(page.getByText(/00000000-0000-0000-0000-000000000001/)).not.toBeVisible();
  58 | });
  59 | 
  60 | test("operator direct URL to client portal is denied", async ({ page }) => {
  61 |   const op = operatorCredentials();
  62 |   test.skip(!op, "SMOKE_OPERATOR_EMAIL/PASSWORD not set");
  63 |   attachConsoleGuards(page);
  64 |   await loginViaUi(page, op!);
  65 |   await page.goto("/lavorazioni-clienti");
  66 |   await expect(page).toHaveURL(/acesso-negato|\/dashboard/, { timeout: 30_000 });
  67 | });
  68 | 
  69 | test("client user cannot open alien lavorazione id", async ({ page }) => {
  70 |   const client = clientCredentials();
  71 |   const alienId = process.env.SMOKE_CLIENT_LAVORAZIONE_ALIEN_ID?.trim();
  72 |   test.skip(!client || !alienId, "SMOKE_CLIENT_* / SMOKE_CLIENT_LAVORAZIONE_ALIEN_ID not set");
  73 |   attachConsoleGuards(page);
  74 |   await loginViaUi(page, client!);
  75 |   await page.goto(`/lavorazioni-clienti/${encodeURIComponent(alienId!)}`);
  76 |   await expect(
  77 |     page.getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata|Non hai permesso/i),
  78 |   ).toBeVisible({ timeout: 30_000 });
  79 | });
  80 | 
```