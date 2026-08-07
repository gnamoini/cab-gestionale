import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, managerCredentials, operatoreCredentials } from "../fixtures/auth";
import { buildSchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";
import {
  attachSchedaPayloadCapture,
  openNuovaLavorazioneSchedaVuota,
  clickSalvaSchedaHub,
  clickSalvaSchedaIngressoEdit,
  confirmMezzoAnagraficaChanges,
  cancelMezzoAnagraficaConfirm,
  expectMezzoAnagraficaConfirmVisible,
  expectMezzoLinkConfirmHidden,
  expectMezzoLinkConfirmVisible,
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
  selectMezzoFromSearchByTarga,
  selectNuovoMezzoFromSearch,
  submitCreateLavorazione,
  waitForGlobalOptionsReady,
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
  await openNuovaLavorazioneSchedaVuota(page);
  await fillMinimalCreateAndSaveWithoutClienteBlur(page, fixture);
});

test("create → save → hub panoramica → edit ingresso → scheda lavorazioni", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();
  const capture = attachSchedaPayloadCapture(page);
  const { ingresso, ingressoEdit, lavorazioni, lavorazioneNote, lavorazioneNoteEdit, token } = fixture;

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await openNuovaLavorazioneSchedaVuota(page);

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
      await editModal.getByLabel("Ore lavoro motore").fill(val);
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

test("mezzo esistente: modifica anagrafica richiede conferma prima del salvataggio", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();
  const newTarga = `${fixture.ingresso.targa}X`.slice(0, 7);

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");

  await openNuovaLavorazioneSchedaVuota(page);
  await fillSchedaIngressoCreateForm(page, fixture.ingresso);
  await submitCreateLavorazione(page);

  await page.getByRole("button", { name: /\+?\s*Nuova(\s+lavorazione)?/i }).click();
  await selectMezzoFromSearchByTarga(page, fixture.ingresso.targa);

  const scheda = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await waitForGlobalOptionsReady(scheda);
  const targaInput = scheda.getByRole("combobox", { name: /targa/i });
  await targaInput.scrollIntoViewIfNeeded();
  await targaInput.fill(newTarga);

  const save = scheda.getByRole("button", { name: "Salva lavorazione" });
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await expectMezzoLinkConfirmHidden(page);
  await expectMezzoAnagraficaConfirmVisible(page);

  await cancelMezzoAnagraficaConfirm(page);
  await expect(scheda).toBeVisible();
  await expect(targaInput).toHaveValue(newTarga);

  await targaInput.fill(newTarga);
  await save.click();
  await expectMezzoAnagraficaConfirmVisible(page);
  const createResponse = page.waitForResponse(
    (res) => res.url().includes("/rest/v1/lavorazioni") && res.request().method() === "POST" && res.ok(),
    { timeout: 120_000 },
  );
  await confirmMezzoAnagraficaChanges(page);
  await createResponse;
  await expect(scheda).toBeHidden({ timeout: 60_000 });
});

test("edit ingresso: un solo PATCH lavorazioni per salvataggio Info lavorazione", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await openNuovaLavorazioneSchedaVuota(page);
  await fillSchedaIngressoCreateForm(page, fixture.ingresso);
  await submitCreateLavorazione(page);

  await searchLavorazioneByToken(page, fixture.token);
  await openSchedeHubForToken(page, fixture.token);
  await openIngressoEditorFromHub(page);

  const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  const tagliando = editModal.getByRole("checkbox", { name: /Tagliando/i });
  if (await tagliando.isVisible().catch(() => false)) {
    await tagliando.check();
  }

  let patchCount = 0;
  const onPatch = (req: import("@playwright/test").Request) => {
    if (
      req.url().includes("/rest/v1/lavorazioni") &&
      (req.method() === "PATCH" || req.method() === "PUT")
    ) {
      patchCount += 1;
    }
  };
  page.on("request", onPatch);

  await clickSalvaSchedaIngressoEdit(editModal, { confirmMezzoAnagrafica: false });
  page.off("request", onPatch);

  expect(patchCount).toBeLessThanOrEqual(1);
});

test("edit ingresso: solo numero scuderia non mostra matricola fantasma", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();
  const scuderiaOnly = `SC${Date.now().toString().slice(-6)}`;

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await openNuovaLavorazioneSchedaVuota(page);

  const ingressoSoloScuderia = {
    ...fixture.ingresso,
    targa: "",
    matricola: "",
    nScuderia: scuderiaOnly,
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
  };
  await fillSchedaIngressoCreateForm(page, ingressoSoloScuderia);
  await submitCreateLavorazione(page);

  await searchLavorazioneByToken(page, fixture.token);
  await openSchedeHubForToken(page, fixture.token);
  await openIngressoEditorFromHub(page);

  const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  const matricolaInput = editModal.getByLabel(/matricola/i);
  await expect(matricolaInput).toHaveValue("");
  await clickSalvaSchedaIngressoEdit(editModal, { confirmMezzoAnagrafica: false });

  await openIngressoEditorFromHub(page);
  const editModal2 = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  await expect(editModal2.getByLabel(/matricola/i)).toHaveValue("");
});

test("edit scheda ingresso: modifica targa mezzo collegato richiede conferma", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();
  const newTarga = `${fixture.ingresso.targa}Y`.slice(0, 7);

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");

  await openNuovaLavorazioneSchedaVuota(page);
  await fillSchedaIngressoCreateForm(page, fixture.ingresso);
  await submitCreateLavorazione(page);

  await searchLavorazioneByToken(page, fixture.token);
  await openSchedeHubForToken(page, fixture.token);
  await openIngressoEditorFromHub(page);

  const editModal = page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" });
  const targaInput = editModal.getByRole("combobox", { name: /targa/i });
  await targaInput.scrollIntoViewIfNeeded();
  await targaInput.fill(newTarga);

  const save = editModal.getByRole("button", { name: "Salva scheda" });
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await expectMezzoAnagraficaConfirmVisible(page);

  await cancelMezzoAnagraficaConfirm(page);
  await expect(editModal).toBeVisible();
  await expect(targaInput).toHaveValue(newTarga);

  await save.click();
  await expectMezzoAnagraficaConfirmVisible(page);
  await confirmMezzoAnagraficaChanges(page);
  await expect(editModal).toBeHidden({ timeout: 60_000 });
});

test("catalog mezzo: salvataggio diretto senza modal collegamento", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");

  await openNuovaLavorazioneSchedaVuota(page);
  await fillSchedaIngressoCreateForm(page, fixture.ingresso);
  await submitCreateLavorazione(page);

  await page.getByRole("button", { name: /\+?\s*Nuova(\s+lavorazione)?/i }).click();
  await selectMezzoFromSearchByTarga(page, fixture.ingresso.targa);

  const scheda = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await waitForGlobalOptionsReady(scheda);
  const save = scheda.getByRole("button", { name: "Salva lavorazione" });
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await expectMezzoLinkConfirmHidden(page);
  await expect(scheda).toBeHidden({ timeout: 60_000 });
});

test("nuovo mezzo: targa esistente mostra modal collegamento", async ({ page }) => {
  test.setTimeout(900_000);
  const fixture = buildSchedaIngressoAuditFixture();

  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");

  await openNuovaLavorazioneSchedaVuota(page);
  await fillSchedaIngressoCreateForm(page, fixture.ingresso);
  await submitCreateLavorazione(page);

  await page.getByRole("button", { name: /\+?\s*Nuova(\s+lavorazione)?/i }).click();
  await selectNuovoMezzoFromSearch(page);

  const scheda = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await waitForGlobalOptionsReady(scheda);
  await fillListCombobox(page, "Cliente", fixture.ingresso.cliente, scheda);
  await scheda.getByLabel("Data ingresso").fill(fixture.ingresso.dataIngresso);
  const targaInput = scheda.getByRole("combobox", { name: /targa/i });
  await targaInput.scrollIntoViewIfNeeded();
  await targaInput.fill(fixture.ingresso.targa);

  const save = scheda.getByRole("button", { name: "Salva lavorazione" });
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await expectMezzoLinkConfirmVisible(page);
});

async function smokeCreateLavorazioneForRole(
  page: import("@playwright/test").Page,
  creds: { email: string; password: string },
): Promise<void> {
  const fixture = buildSchedaIngressoAuditFixture();
  await loginViaUi(page, creds);
  await page.goto("/lavorazioni");
  await openNuovaLavorazioneSchedaVuota(page);
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
