import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, managerCredentials, operatoreCredentials } from "../fixtures/auth";
import { buildSchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";
import {
  attachSchedaPayloadCapture,
  clickNuovaLavorazioneCta,
  clickSalvaSchedaHub,
  clickSalvaSchedaIngressoEdit,
  fillListCombobox,
  fillIdentificazioneMacchina,
  fillLavorazioniRigaPrima,
  fillMinimalCreateAndSaveWithoutClienteBlur,
  fillSchedaIngressoCreateForm,
  hubDialog,
  openIngressoEditorFromHub,
  openLavorazioniEditorFromHub,
  openSchedeHubForToken,
  searchLavorazioneByToken,
  submitCreateLavorazione,
} from "../helpers/lavorazioni-scheda";
import { applySmokeTeardown } from "../helpers/smoke-teardown";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

test.describe.configure({ mode: "serial", timeout: 900_000 });

test.beforeEach(({ page }) => {
  test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
  attachConsoleGuards(page);
});

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("iOS regression: cliente combobox salvato senza blur prima del submit", async ({ page }) => {
  const fixture = buildSchedaIngressoAuditFixture();
  attachSchedaPayloadCapture(page);

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await clickNuovaLavorazioneCta(page);
  await fillMinimalCreateAndSaveWithoutClienteBlur(page, fixture);
});

test("create → save → hub panoramica → edit ingresso → scheda lavorazioni", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();
  const capture = attachSchedaPayloadCapture(page);
  const { ingresso, ingressoEdit, lavorazioni, lavorazioneNote, lavorazioneNoteEdit, token } = fixture;

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await clickNuovaLavorazioneCta(page);

  await fillSchedaIngressoCreateForm(page, ingresso);
  await submitCreateLavorazione(page);

  await searchLavorazioneByToken(page, token);
  await openSchedeHubForToken(page, token);

  const hub = hubDialog(page);
  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(ingresso.cliente)).toBeVisible();
  await expect(hub.getByText(ingresso.richiedente)).toBeVisible();
  const noteArea = hub.getByLabel("Note");
  await noteArea.fill(lavorazioneNote);
  await hub.getByRole("button", { name: "Salva note" }).click();
  await expect(hub.getByText(lavorazioneNote.split("\n")[0]!)).toBeVisible();

  await openIngressoEditorFromHub(page);
  const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  await expect(editModal.getByRole("combobox", { name: "Cliente" })).toHaveValue(ingresso.cliente);

  for (const [key, val] of Object.entries(ingressoEdit) as [keyof typeof ingressoEdit, string][]) {
    if (key === "cliente" || key === "cantiere" || key === "utilizzatore") {
      await fillListCombobox(
        page,
        key === "cliente" ? "Cliente" : key === "cantiere" ? "Cantiere" : "Utilizzatore",
        val,
        editModal,
      );
    } else if (key === "richiedente") {
      await editModal.getByLabel("Richiedente").fill(val);
    } else if (key === "descrizioneAnomalia") {
      await editModal.getByLabel("Descrizione anomalia").fill(val);
    } else if (key === "km") {
      await editModal.getByLabel("KM").fill(val);
    } else if (key === "oreLavoro") {
      await editModal.getByLabel("Ore lavoro").fill(val);
    }
  }

  await clickSalvaSchedaIngressoEdit(editModal);

  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(ingressoEdit.cliente!)).toBeVisible();

  await openLavorazioniEditorFromHub(page);
  await fillIdentificazioneMacchina(hub, lavorazioni.identificazioneMacchina);
  await fillLavorazioniRigaPrima(hub, lavorazioni.riga);
  await clickSalvaSchedaHub(hub);

  await hub.getByRole("tab", { name: /Panoramica/i }).click();
  await expect(hub.getByText(lavorazioni.identificazioneMacchina)).toBeVisible({ timeout: 15_000 });

  const payloadWithCliente = capture.ingressoCampi.find((c) => c.cliente === ingresso.cliente);
  expect(payloadWithCliente).toBeTruthy();
});

async function smokeCreateLavorazioneForRole(
  page: import("@playwright/test").Page,
  creds: { email: string; password: string },
): Promise<void> {
  const fixture = buildSchedaIngressoAuditFixture();
  await loginViaUi(page, creds);
  await page.goto("/lavorazioni");
  await clickNuovaLavorazioneCta(page);
  await fillMinimalCreateAndSaveWithoutClienteBlur(page, fixture);
  await submitCreateLavorazione(page);
  await searchLavorazioneByToken(page, fixture.token);
}

test.describe("multi-role write path", () => {
  test("manager: create lavorazione", async ({ page }) => {
    const creds = managerCredentials();
    test.skip(!creds, "SMOKE_MANAGER_EMAIL e SMOKE_MANAGER_PASSWORD richiesti");
    attachConsoleGuards(page);
    await smokeCreateLavorazioneForRole(page, creds!);
  });

  test("operatore: create lavorazione", async ({ page }) => {
    const creds = operatoreCredentials();
    test.skip(!creds, "SMOKE_OPERATORE_EMAIL e SMOKE_OPERATORE_PASSWORD richiesti");
    attachConsoleGuards(page);
    await smokeCreateLavorazioneForRole(page, creds!);
  });
});
