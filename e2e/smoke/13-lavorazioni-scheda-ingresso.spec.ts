import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { buildSchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";
import {
  attachSchedaPayloadCapture,
  fillListCombobox,
  clickNuovaLavorazioneCta,
  fillMinimalCreateAndSaveWithoutClienteBlur,
  fillSchedaIngressoCreateForm,
  openIngressoEditorFromHub,
  openLavorazioniEditorFromHub,
  openSchedeHubForToken,
  searchLavorazioneByToken,
  submitCreateLavorazione,
} from "../helpers/lavorazioni-scheda";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeEach(({ page }) => {
  test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
  attachConsoleGuards(page);
});

test("iOS regression: cliente combobox salvato senza blur prima del submit", async ({ page }) => {
  const fixture = buildSchedaIngressoAuditFixture();
  const capture = attachSchedaPayloadCapture(page);

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await clickNuovaLavorazioneCta(page);
  await fillMinimalCreateAndSaveWithoutClienteBlur(page, fixture);

  await expect(async () => {
    const lastPayload = capture.ingressoCampi.at(-1);
    expect(lastPayload?.cliente).toBe(fixture.ingresso.cliente);
  }).toPass({ timeout: 90_000 });

  await expect(page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" })).not.toBeVisible({
    timeout: 30_000,
  });

  await searchLavorazioneByToken(page, fixture.token);
});

test("create → save → hub panoramica → edit ingresso → scheda lavorazioni", async ({ page }) => {
  const fixture = buildSchedaIngressoAuditFixture();
  const capture = attachSchedaPayloadCapture(page);
  const { ingresso, ingressoEdit, lavorazioni, token } = fixture;

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await clickNuovaLavorazioneCta(page);

  await fillSchedaIngressoCreateForm(page, ingresso);
  await submitCreateLavorazione(page);

  await searchLavorazioneByToken(page, token);
  await openSchedeHubForToken(page, token);

  const hub = page.getByRole("dialog").filter({ hasText: "Dettaglio lavorazione" });
  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(ingresso.cliente)).toBeVisible();
  await expect(hub.getByText(ingresso.richiedente)).toBeVisible();
  await expect(hub.getByText(ingresso.noteIntervento.split("\n")[0]!)).toBeVisible();

  await openIngressoEditorFromHub(page);
  const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  await expect(editModal.getByRole("combobox", { name: "Cliente" })).toHaveValue(ingresso.cliente);

  for (const [key, val] of Object.entries(ingressoEdit) as [keyof typeof ingressoEdit, string][]) {
    if (key === "cliente" || key === "cantiere" || key === "utilizzatore") {
      await fillListCombobox(page, key === "cliente" ? "Cliente" : key === "cantiere" ? "Cantiere" : "Utilizzatore", val);
    } else if (key === "richiedente") {
      await editModal.getByLabel("Richiedente").fill(val);
    } else if (key === "noteIntervento") {
      await editModal.getByLabel("Note").fill(val);
    } else if (key === "descrizioneAnomalia") {
      await editModal.getByLabel("Descrizione anomalia").fill(val);
    } else if (key === "km") {
      await editModal.getByLabel("KM").fill(val);
    } else if (key === "oreLavoro") {
      await editModal.getByLabel("Ore lavoro").fill(val);
    }
  }

  await editModal.getByRole("button", { name: "Salva scheda" }).click();
  await expect(editModal).not.toBeVisible({ timeout: 30_000 });

  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(ingressoEdit.cliente!)).toBeVisible();

  await openLavorazioniEditorFromHub(page);
  await hub.getByText("Identificazione macchina").locator("..").locator("input").fill(lavorazioni.identificazioneMacchina);
  const row = hub.locator("tbody tr").first();
  await row.getByLabel("Data").fill(lavorazioni.riga.dataLavorazione);
  await row.locator("textarea").fill(lavorazioni.riga.lavorazioniEffettuate);
  const addettoCombo = hub.getByRole("combobox", { name: "Addetto riga lavorazione" });
  await addettoCombo.click();
  await addettoCombo.press("ArrowDown");
  await addettoCombo.press("Enter");
  await row.locator('input[type="number"]').fill(String(lavorazioni.riga.addettoOre));
  await hub.getByRole("button", { name: "Salva scheda" }).click();

  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(lavorazioni.identificazioneMacchina)).toBeVisible({ timeout: 15_000 });

  const payloadWithCliente = capture.ingressoCampi.find((c) => c.cliente === ingresso.cliente);
  expect(payloadWithCliente).toBeTruthy();
});
