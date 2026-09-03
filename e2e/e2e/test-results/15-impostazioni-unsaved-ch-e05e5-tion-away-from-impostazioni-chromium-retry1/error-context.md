# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 15-impostazioni.spec.ts >> unsaved changes dialog blocks navigation away from impostazioni
- Location: e2e\smoke\15-impostazioni.spec.ts:52:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Dashboard' }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - region "Attiva notifiche gestionale" [ref=e12]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - img [ref=e18]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - paragraph [ref=e22]: Attiva le notifiche
            - generic [ref=e23]: Su questo browser
          - paragraph [ref=e24]: Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.
      - generic [ref=e26]:
        - button "No, grazie" [ref=e27] [cursor=pointer]
        - button "Sì, attiva" [ref=e28] [cursor=pointer]
  - main [ref=e32]:
    - generic [ref=e35]:
      - generic [ref=e38]:
        - button "Apri menu" [ref=e40] [cursor=pointer]:
          - img [ref=e41]
        - generic [ref=e43]:
          - heading "Configurazione" [level=1]
        - button "Azioni pagina" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e51]: Azioni pagina
      - generic [ref=e56]:
        - group "Azioni salvataggio" [ref=e59]:
          - status [ref=e60]: Modifiche non salvate
          - button "Annulla modifiche" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: Annulla modifiche
          - button "Salva modifiche" [ref=e64] [cursor=pointer]:
            - generic [ref=e65]: Salva modifiche
        - generic [ref=e66]:
          - complementary [ref=e67]:
            - generic [ref=e68]:
              - button "Panoramica" [ref=e70] [cursor=pointer]:
                - img [ref=e72]
                - generic [ref=e77]: Panoramica
              - navigation "Elenco sezioni configurazione" [ref=e78]:
                - region "Personalizzazione" [ref=e79]:
                  - heading "Personalizzazione" [level=3] [ref=e80]
                  - list [ref=e81]:
                    - listitem [ref=e82]:
                      - button "Branding" [ref=e83] [cursor=pointer]:
                        - img [ref=e85]
                        - generic [ref=e87]: Branding
                - region "Operatività" [ref=e88]:
                  - heading "Operatività" [level=3] [ref=e89]
                  - list [ref=e90]:
                    - listitem [ref=e91]:
                      - button "Dipendenti" [ref=e92] [cursor=pointer]:
                        - img [ref=e94]
                        - generic [ref=e98]: Dipendenti
                    - listitem [ref=e99]:
                      - button "Tipi assenza dipendenti" [ref=e100] [cursor=pointer]:
                        - img [ref=e102]
                        - generic [ref=e106]: Tipi assenza dipendenti
                    - listitem [ref=e107]:
                      - button "Stati lavorazioni" [ref=e108] [cursor=pointer]:
                        - img [ref=e110]
                        - generic [ref=e115]: Stati lavorazioni
                    - listitem [ref=e116]:
                      - button "Priorità" [ref=e117] [cursor=pointer]:
                        - img [ref=e119]
                        - generic [ref=e121]: Priorità
                - region "Magazzino" [ref=e122]:
                  - heading "Magazzino" [level=3] [ref=e123]
                  - list [ref=e124]:
                    - listitem [ref=e125]:
                      - button "Marche ricambi" [ref=e126] [cursor=pointer]:
                        - img [ref=e128]
                        - generic [ref=e131]: Marche ricambi
                    - listitem [ref=e132]:
                      - button "Fornitori alternativi" [ref=e133] [cursor=pointer]:
                        - img [ref=e135]
                        - generic [ref=e138]: Fornitori alternativi
                    - listitem [ref=e139]:
                      - button "Produttori" [ref=e140] [cursor=pointer]:
                        - img [ref=e142]
                        - generic [ref=e147]: Produttori
                    - listitem [ref=e148]:
                      - button "Categorie" [ref=e149] [cursor=pointer]:
                        - img [ref=e151]
                        - generic [ref=e153]: Categorie
                - region [ref=e154]:
                  - heading "Clienti commerciali" [level=3] [ref=e155]
                  - list [ref=e156]:
                    - listitem [ref=e157]:
                      - button "Cliente" [ref=e158] [cursor=pointer]:
                        - img [ref=e160]
                        - generic [ref=e164]: Cliente
                    - listitem [ref=e165]:
                      - button "Cantiere" [ref=e166] [cursor=pointer]:
                        - img [ref=e168]
                        - generic [ref=e171]: Cantiere
                    - listitem [ref=e172]:
                      - button "Utilizzatore" [ref=e173] [cursor=pointer]:
                        - img [ref=e175]
                        - generic [ref=e179]: Utilizzatore
                - region "Attrezzatura" [ref=e180]:
                  - heading "Attrezzatura" [level=3] [ref=e181]
                  - list [ref=e182]:
                    - listitem [ref=e183]:
                      - button "Tipo attrezzatura" [ref=e184] [cursor=pointer]:
                        - img [ref=e186]
                        - generic [ref=e188]: Tipo attrezzatura
                    - listitem [ref=e189]:
                      - button "Marca attrezzatura" [ref=e190] [cursor=pointer]:
                        - img [ref=e192]
                        - generic [ref=e194]: Marca attrezzatura
                    - listitem [ref=e195]:
                      - button "Modello attrezzatura" [ref=e196] [cursor=pointer]:
                        - img [ref=e198]
                        - generic [ref=e201]: Modello attrezzatura
                - region "Telaio" [ref=e202]:
                  - heading "Telaio" [level=3] [ref=e203]
                  - list [ref=e204]:
                    - listitem [ref=e205]:
                      - button "Tipo telaio" [ref=e206] [cursor=pointer]:
                        - img [ref=e208]
                        - generic [ref=e213]: Tipo telaio
                    - listitem [ref=e214]:
                      - button "Marca telaio" [ref=e215] [cursor=pointer]:
                        - img [ref=e217]
                        - generic [ref=e219]: Marca telaio
                    - listitem [ref=e220]:
                      - button "Modello telaio" [ref=e221] [cursor=pointer]:
                        - img [ref=e223]
                        - generic [ref=e226]: Modello telaio
                - region "Comunicazioni" [ref=e227]:
                  - heading "Comunicazioni" [level=3] [ref=e228]
                  - list [ref=e229]:
                    - listitem [ref=e230]:
                      - button "Comunicazioni" [ref=e231] [cursor=pointer]:
                        - img [ref=e233]
                        - generic [ref=e236]: Comunicazioni
                - region "Sistema" [ref=e237]:
                  - heading "Sistema" [level=3] [ref=e238]
                  - list [ref=e239]:
                    - listitem [ref=e240]:
                      - button "Stato propagazioni" [ref=e241] [cursor=pointer]:
                        - img [ref=e243]
                        - generic [ref=e247]: Stato propagazioni
                    - listitem [ref=e248]:
                      - button "Profilo officina" [ref=e249] [cursor=pointer]:
                        - img [ref=e251]
                        - generic [ref=e256]: Profilo officina
                    - listitem [ref=e257]:
                      - button "Parametri economici" [ref=e258] [cursor=pointer]:
                        - img [ref=e260]
                        - generic [ref=e262]: Parametri economici
                    - listitem [ref=e263]:
                      - button "Knowledge Base tecnica" [ref=e264] [cursor=pointer]:
                        - img [ref=e266]
                        - generic [ref=e268]: Knowledge Base tecnica
          - main "Parametri economici" [ref=e269]:
            - heading "Parametri economici" [level=2] [ref=e271]
            - generic [ref=e274] [cursor=pointer]:
              - generic [ref=e275]:
                - generic [ref=e276]: Costo manodopera default
                - generic [ref=e277]: Valore orario in euro applicato ai nuovi preventivi e ai report quando non è indicato un costo specifico.
              - generic [ref=e279]:
                - spinbutton "Costo manodopera default in euro all'ora" [active] [ref=e280]: "49"
                - generic: €/h
```

# Test source

```ts
  1  | import type { Page } from "@playwright/test";
  2  | import { attachConsoleGuards } from "../helpers/console";
  3  | import { adminCredentials, loginViaUi } from "../fixtures/auth";
  4  | import { test, expect } from "@playwright/test";
  5  | 
  6  | test.describe.configure({ mode: "serial" });
  7  | 
  8  | async function openParametriEconomici(page: Page): Promise<void> {
  9  |   await page.locator("aside").getByRole("button", { name: "Parametri economici", exact: true }).click();
  10 |   await expect(page.locator("#config-costo-orario-default")).toBeVisible({ timeout: 15_000 });
  11 | }
  12 | 
  13 | async function saveSettingsAndWait(page: Page): Promise<void> {
  14 |   const saveBtn = page.getByRole("button", { name: /^Salva( modifiche)?$/ });
  15 |   await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  16 |   const saveDone = page.waitForResponse(
  17 |     (res) => res.url().includes("bulk_upsert_app_settings") && res.ok(),
  18 |     { timeout: 60_000 },
  19 |   );
  20 |   await saveBtn.click();
  21 |   await expect(page.getByRole("button", { name: /Salvataggio/ })).toBeVisible({ timeout: 10_000 });
  22 |   await saveDone;
  23 |   await expect(page.getByRole("button", { name: /Salvataggio/ })).toBeHidden({ timeout: 15_000 });
  24 | }
  25 | 
  26 | test("admin opens impostazioni and saves parametri economici", async ({ page }) => {
  27 |   attachConsoleGuards(page);
  28 |   await loginViaUi(page, adminCredentials());
  29 |   await page.goto("/impostazioni");
  30 |   await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });
  31 |   await openParametriEconomici(page);
  32 | 
  33 |   const input = page.locator("#config-costo-orario-default");
  34 |   await expect(input).toBeVisible({ timeout: 15_000 });
  35 |   const before = await input.inputValue();
  36 |   const next = before === "50" ? "51" : "50";
  37 |   await input.fill(next);
  38 |   await input.blur();
  39 | 
  40 |   await saveSettingsAndWait(page);
  41 | 
  42 |   await page.reload();
  43 |   await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });
  44 |   await openParametriEconomici(page);
  45 |   await expect(page.locator("#config-costo-orario-default")).toHaveValue(next, { timeout: 30_000 });
  46 | 
  47 |   // Ripristina valore originale per non sporcare l'ambiente smoke
  48 |   await page.locator("#config-costo-orario-default").fill(before);
  49 |   await saveSettingsAndWait(page);
  50 | });
  51 | 
  52 | test("unsaved changes dialog blocks navigation away from impostazioni", async ({ page }) => {
  53 |   attachConsoleGuards(page);
  54 |   await loginViaUi(page, adminCredentials());
  55 |   await page.goto("/impostazioni");
  56 |   await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });
  57 |   await openParametriEconomici(page);
  58 | 
  59 |   const input = page.locator("#config-costo-orario-default");
  60 |   await expect(input).toBeVisible({ timeout: 15_000 });
  61 |   const before = await input.inputValue();
  62 |   const draft = before === "49" ? "48.5" : "49";
  63 |   await input.fill(draft);
  64 | 
> 65 |   await page.getByRole("link", { name: "Dashboard" }).first().click();
     |                                                               ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  66 |   const unsavedDialog = page.getByRole("dialog");
  67 |   await expect(unsavedDialog).toBeVisible({ timeout: 10_000 });
  68 |   await expect(unsavedDialog.getByRole("heading", { name: "Modifiche non salvate" })).toBeVisible();
  69 | 
  70 |   await page.getByRole("button", { name: "Torna indietro" }).click();
  71 |   await expect(page).toHaveURL(/\/impostazioni/);
  72 |   await expect(input).toHaveValue(draft);
  73 | 
  74 |   await page.getByRole("button", { name: "Annulla modifiche" }).first().click();
  75 |   const cancelDialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Annullare modifiche?" }) });
  76 |   await expect(cancelDialog).toBeVisible({ timeout: 5_000 });
  77 |   await cancelDialog.getByRole("button", { name: "Annulla modifiche" }).click();
  78 |   await expect(input).toHaveValue(before, { timeout: 10_000 });
  79 | });
  80 | 
```