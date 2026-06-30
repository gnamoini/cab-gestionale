# Test info

- Name: iOS regression: cliente combobox salvato senza blur prima del submit
- Location: C:\Projects\gestionale-cab\e2e\smoke\13-lavorazioni-scheda-ingresso.spec.ts:39:5

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\gnamo\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { test, expect } from "@playwright/test";
   2 | import { attachConsoleGuards } from "../helpers/console";
   3 | import { adminCredentials, loginViaUi } from "../fixtures/auth";
   4 | import { buildSchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";
   5 | import {
   6 |   attachSchedaPayloadCapture,
   7 |   clickNuovaLavorazioneCta,
   8 |   clickSalvaSchedaHub,
   9 |   clickSalvaSchedaIngressoEdit,
   10 |   fillListCombobox,
   11 |   fillIdentificazioneMacchina,
   12 |   fillLavorazioniRigaPrima,
   13 |   fillMinimalCreateAndSaveWithoutClienteBlur,
   14 |   fillSchedaIngressoCreateForm,
   15 |   hubDialog,
   16 |   openIngressoEditorFromHub,
   17 |   openLavorazioniEditorFromHub,
   18 |   openSchedeHubForToken,
   19 |   searchLavorazioneByToken,
   20 |   submitCreateLavorazione,
   21 | } from "../helpers/lavorazioni-scheda";
   22 | import { applySmokeTeardown } from "../helpers/smoke-teardown";
   23 |
   24 | const hasSmokeCreds = Boolean(
   25 |   process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
   26 | );
   27 |
   28 | test.describe.configure({ mode: "serial", timeout: 180_000 });
   29 |
   30 | test.beforeEach(({ page }) => {
   31 |   test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
   32 |   attachConsoleGuards(page);
   33 | });
   34 |
   35 | test.afterAll(async () => {
   36 |   await applySmokeTeardown();
   37 | });
   38 |
>  39 | test("iOS regression: cliente combobox salvato senza blur prima del submit", async ({ page }) => {
      |     ^ Error: browserType.launch: Executable doesn't exist at C:\Users\gnamo\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   40 |   const fixture = buildSchedaIngressoAuditFixture();
   41 |   attachSchedaPayloadCapture(page);
   42 |
   43 |   await loginViaUi(page, adminCredentials());
   44 |   await page.goto("/lavorazioni");
   45 |   await clickNuovaLavorazioneCta(page);
   46 |   await fillMinimalCreateAndSaveWithoutClienteBlur(page, fixture);
   47 | });
   48 |
   49 | test("create → save → hub panoramica → edit ingresso → scheda lavorazioni", async ({ page }) => {
   50 |   const fixture = buildSchedaIngressoAuditFixture();
   51 |   const capture = attachSchedaPayloadCapture(page);
   52 |   const { ingresso, ingressoEdit, lavorazioni, token } = fixture;
   53 |
   54 |   await loginViaUi(page, adminCredentials());
   55 |   await page.goto("/lavorazioni");
   56 |   await clickNuovaLavorazioneCta(page);
   57 |
   58 |   await fillSchedaIngressoCreateForm(page, ingresso);
   59 |   await submitCreateLavorazione(page);
   60 |
   61 |   await searchLavorazioneByToken(page, token);
   62 |   await openSchedeHubForToken(page, token);
   63 |
   64 |   const hub = hubDialog(page);
   65 |   await hub.getByRole("tab", { name: /Panoramica/i }).click();
   66 |   await expect(hub.getByText(ingresso.cliente)).toBeVisible();
   67 |   await expect(hub.getByText(ingresso.richiedente)).toBeVisible();
   68 |   await expect(hub.getByText(ingresso.noteIntervento.split("\n")[0]!)).toBeVisible();
   69 |
   70 |   await openIngressoEditorFromHub(page);
   71 |   const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
   72 |   await expect(editModal.getByRole("combobox", { name: "Cliente" })).toHaveValue(ingresso.cliente);
   73 |
   74 |   for (const [key, val] of Object.entries(ingressoEdit) as [keyof typeof ingressoEdit, string][]) {
   75 |     if (key === "cliente" || key === "cantiere" || key === "utilizzatore") {
   76 |       await fillListCombobox(
   77 |         page,
   78 |         key === "cliente" ? "Cliente" : key === "cantiere" ? "Cantiere" : "Utilizzatore",
   79 |         val,
   80 |         editModal,
   81 |       );
   82 |     } else if (key === "richiedente") {
   83 |       await editModal.getByLabel("Richiedente").fill(val);
   84 |     } else if (key === "noteIntervento") {
   85 |       await editModal.getByLabel("Note").fill(val);
   86 |     } else if (key === "descrizioneAnomalia") {
   87 |       await editModal.getByLabel("Descrizione anomalia").fill(val);
   88 |     } else if (key === "km") {
   89 |       await editModal.getByLabel("KM").fill(val);
   90 |     } else if (key === "oreLavoro") {
   91 |       await editModal.getByLabel("Ore lavoro").fill(val);
   92 |     }
   93 |   }
   94 |
   95 |   await clickSalvaSchedaIngressoEdit(editModal);
   96 |
   97 |   await hub.getByRole("tab", { name: /Panoramica/i }).click();
   98 |   await expect(hub.getByText(ingressoEdit.cliente!)).toBeVisible();
   99 |
  100 |   await openLavorazioniEditorFromHub(page);
  101 |   await fillIdentificazioneMacchina(hub, lavorazioni.identificazioneMacchina);
  102 |   await fillLavorazioniRigaPrima(hub, lavorazioni.riga);
  103 |   await clickSalvaSchedaHub(hub);
  104 |
  105 |   await hub.getByRole("tab", { name: /Panoramica/i }).click();
  106 |   await expect(hub.getByText(lavorazioni.identificazioneMacchina)).toBeVisible({ timeout: 15_000 });
  107 |
  108 |   const payloadWithCliente = capture.ingressoCampi.find((c) => c.cliente === ingresso.cliente);
  109 |   expect(payloadWithCliente).toBeTruthy();
  110 | });
  111 |
```