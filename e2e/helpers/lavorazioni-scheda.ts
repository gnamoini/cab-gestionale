import { expect, type Locator, type Page, type Response } from "@playwright/test";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSchedaCampiFromBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  let contenuto: unknown = record.contenuto;
  if (typeof contenuto === "string") {
    try {
      contenuto = JSON.parse(contenuto) as unknown;
    } catch {
      return null;
    }
  }
  if (!contenuto || typeof contenuto !== "object") return null;
  const doc = (contenuto as { doc?: { campi?: Record<string, unknown> } }).doc;
  if (doc?.campi && typeof doc.campi === "object") return doc.campi;
  return null;
}

function parseSchedaCampiFromRequest(response: Response): Record<string, unknown> | null {
  try {
    const body = response.request().postDataJSON();
    return parseSchedaCampiFromBody(body);
  } catch {
    return null;
  }
}

async function parseSchedaCampiFromResponse(response: Response): Promise<Record<string, unknown> | null> {
  const fromRequest = parseSchedaCampiFromRequest(response);
  if (fromRequest) return fromRequest;
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return parseSchedaCampiFromBody(body);
  } catch {
    return null;
  }
}

/** Hub schede lavorazione — evita ambiguità con modali figli. */
export function hubDialog(page: Page): Locator {
  return page.getByRole("dialog").filter({ hasText: "Dettaglio lavorazione" });
}

async function dismissMezzoPromptIfOpen(page: Page): Promise<void> {
  const mezzoDialog = page.getByRole("dialog").filter({ hasText: "Mezzo già presente" });
  if (await mezzoDialog.isVisible().catch(() => false)) {
    await mezzoDialog.getByRole("button", { name: "Continua manualmente" }).click();
    await expect(mezzoDialog).toBeHidden({ timeout: 10_000 });
  }
}

/** Attende persistenza scheda_lavorazione (POST/PATCH) e opzionalmente verifica cliente. */
export async function waitForSchedaPersist(
  page: Page,
  options?: { expectCliente?: string; requireCampi?: boolean; timeoutMs?: number },
): Promise<{ campi: Record<string, unknown> | null; response: Response }> {
  const timeout = options?.timeoutMs ?? 90_000;
  const response = await page.waitForResponse(
    (res) => {
      if (!res.url().includes("/rest/v1/scheda_lavorazione")) return false;
      const method = res.request().method();
      return method === "POST" || method === "PATCH";
    },
    { timeout },
  );
  expect(response.ok(), `scheda_lavorazione write failed: ${response.status()}`).toBeTruthy();
  const campi = await parseSchedaCampiFromResponse(response);
  if (options?.requireCampi ?? options?.expectCliente !== undefined) {
    expect(campi, "scheda_lavorazione payload missing contenuto.doc.campi").toBeTruthy();
  }
  if (options?.expectCliente !== undefined) {
    expect(campi!.cliente, "cliente in scheda payload").toBe(options.expectCliente);
  }
  return { campi, response };
}

/** Attende creazione lavorazione (POST). */
export async function waitForLavorazioneCreate(page: Page, timeoutMs = 90_000): Promise<Response> {
  const response = await page.waitForResponse(
    (res) => res.url().includes("/rest/v1/lavorazioni") && res.request().method() === "POST",
    { timeout: timeoutMs },
  );
  expect(response.ok(), `lavorazioni POST failed: ${response.status()}`).toBeTruthy();
  return response;
}

/** Attende caricamento opzioni globali (Salva abilitato). */
export async function waitForGlobalOptionsReady(
  modal: Locator,
  saveLabel = "Salva lavorazione",
  timeoutMs = 45_000,
): Promise<void> {
  const save = modal.getByRole("button", { name: saveLabel });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeEnabled({ timeout: timeoutMs });
}

/** Step 1 wizard: selezione mezzo. */
export function mezzoSelectionDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ hasText: "Nuova lavorazione" })
    .filter({ has: page.getByRole("searchbox", { name: "Cerca mezzo" }) });
}

/** Modal scheda ingresso (step 2). */
export function nuovaLavorazioneSchedaDialog(page: Page): Locator {
  return page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
}

export async function selectNuovoMezzoFromSearch(page: Page): Promise<void> {
  const step = mezzoSelectionDialog(page);
  await expect(step).toBeVisible({ timeout: 45_000 });
  await step.getByRole("button", { name: "Nuovo mezzo" }).click();
  const scheda = nuovaLavorazioneSchedaDialog(page);
  await expect(scheda.getByRole("button", { name: "Salva lavorazione" })).toBeVisible({ timeout: 45_000 });
}

export async function selectMezzoFromSearchByTarga(page: Page, targa: string): Promise<void> {
  const step = mezzoSelectionDialog(page);
  await expect(step).toBeVisible({ timeout: 45_000 });
  const search = step.getByRole("searchbox", { name: "Cerca mezzo" });
  await search.fill(targa);
  await step.getByRole("option").filter({ hasText: targa }).first().click();
  const scheda = nuovaLavorazioneSchedaDialog(page);
  await expect(scheda.getByRole("button", { name: "Salva lavorazione" })).toBeVisible({ timeout: 45_000 });
}

/** CTA toolbar: su mobile `+ Nuova`, da sm `+ Nuova lavorazione`. Apre step selezione mezzo. */
export async function clickNuovaLavorazioneCta(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /\+?\s*Nuova(\s+lavorazione)?/i });
  await expect(btn).toBeVisible({ timeout: 45_000 });
  await btn.click();
  await expect(mezzoSelectionDialog(page)).toBeVisible({ timeout: 45_000 });
}

/** Flusso completo fino alla scheda ingresso vuota (nuovo mezzo). */
export async function openNuovaLavorazioneSchedaVuota(page: Page): Promise<void> {
  await clickNuovaLavorazioneCta(page);
  await selectNuovoMezzoFromSearch(page);
}

/** Listbox portal del combobox (`aria-controls`), fallback al primo listbox page. */
async function listboxForCombobox(page: Page, comboboxInput: Locator): Promise<Locator> {
  const controlsId = await comboboxInput.getAttribute("aria-controls");
  if (controlsId?.trim()) {
    return page.locator(`[id="${controlsId.replace(/"/g, '\\"')}"]`);
  }
  return page.getByRole("listbox").first();
}

/** Chiude il listbox portal senza Escape (il modal shell chiude su Escape). */
async function dismissComboboxDropdown(
  page: Page,
  comboboxInput: Locator,
  modalScope?: Locator,
): Promise<void> {
  const listbox = await listboxForCombobox(page, comboboxInput);
  if (!(await listbox.isVisible().catch(() => false))) {
    return;
  }
  await comboboxInput.blur();
  if (await listbox.isVisible().catch(() => false)) {
    const heading = (modalScope ?? page.locator("[data-cab-modal-root]").first()).getByRole("heading", {
      level: 2,
    });
    await heading.click({ force: true });
  }
  await expect(listbox).toBeHidden({ timeout: 5_000 });
}

async function optionInComboboxListbox(page: Page, comboboxInput: Locator, value: string): Promise<Locator> {
  const listbox = await listboxForCombobox(page, comboboxInput);
  return listbox
    .getByRole("option", { name: new RegExp(escapeRegExp(value), "i") })
    .or(page.getByRole("option", { name: new RegExp(escapeRegExp(value), "i") }))
    .first();
}

/** Combobox GlobalSelect / GlobalSettingsListSelect: digita e aggiungi all'elenco se necessario. */
export async function fillListCombobox(
  page: Page,
  ariaLabel: string,
  value: string,
  scope?: Locator,
): Promise<void> {
  const root = scope ?? page;
  const input = root.getByRole("combobox", { name: ariaLabel, exact: true });
  await input.scrollIntoViewIfNeeded();
  await input.click();
  if ((await input.getAttribute("aria-readonly")) === "true") {
    const option = await optionInComboboxListbox(page, input, value);
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
    await expect(input).toHaveValue(value, { timeout: 15_000 });
    await dismissComboboxDropdown(page, input, scope);
    if (scope) await expect(scope).toBeVisible();
    return;
  }
  await input.fill(value);
  const addBtn = page.getByRole("button", { name: new RegExp(`Aggiungi.*${escapeRegExp(value)}`, "i") });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await expect(input).toHaveValue(value, { timeout: 15_000 });
    await dismissComboboxDropdown(page, input, scope);
    if (scope) await expect(scope).toBeVisible();
    return;
  }
  const option = await optionInComboboxListbox(page, input, value);
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    await expect(input).toHaveValue(value, { timeout: 15_000 });
    await dismissComboboxDropdown(page, input, scope);
    if (scope) await expect(scope).toBeVisible();
    return;
  }
  await input.press("Enter");
  await dismissComboboxDropdown(page, input, scope);
  await input.blur();
  await expect(input).toHaveValue(value, { timeout: 15_000 });
  if (scope) await expect(scope).toBeVisible();
  return;
}

export async function fillSchedaIngressoCreateForm(
  page: Page,
  data: SchedaIngressoFields,
  options?: { skipClienteBlurTest?: boolean; skipCliente?: boolean },
): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await expect(modal).toBeVisible();
  await waitForGlobalOptionsReady(modal);

  await modal.getByLabel("Data ingresso").fill(data.dataIngresso);

  if (!options?.skipCliente) {
    await fillListCombobox(page, "Cliente", data.cliente, modal);
  }
  await fillListCombobox(page, "Cantiere", data.cantiere, modal);
  await fillListCombobox(page, "Utilizzatore", data.utilizzatore, modal);
  await modal.getByLabel("Richiedente").fill(data.richiedente);

  await fillListCombobox(page, "Tipo attrezzatura", data.tipoAttrezzatura, modal);
  await fillListCombobox(page, "Marca attrezzatura", data.marcaAttrezzatura, modal);
  if (data.modelloAttrezzatura) {
    await fillListCombobox(page, "Modello attrezzatura", data.modelloAttrezzatura, modal);
  }

  const matricolaInput = modal.getByRole("combobox", { name: /matricola/i });
  await matricolaInput.scrollIntoViewIfNeeded();
  // Regression: marca dropdown portal non deve bloccare focus/digitazione su matricola (no blur esplicito su marca).
  await matricolaInput.click();
  await matricolaInput.fill(data.matricola);
  await expect(matricolaInput).toHaveValue(data.matricola, { timeout: 10_000 });
  await modal.getByLabel("N. scuderia").fill(data.nScuderia);
  await modal.getByLabel("Ore lavoro motore").fill(data.oreLavoro);

  await fillListCombobox(page, "Tipo telaio", data.tipoTelaio, modal);
  await fillListCombobox(page, "Marca telaio", data.marcaTelaio, modal);
  if (data.modelloTelaio) {
    await fillListCombobox(page, "Modello telaio", data.modelloTelaio, modal);
  }

  const targaInput = modal.getByRole("combobox", { name: /targa/i });
  await targaInput.scrollIntoViewIfNeeded();
  await targaInput.fill(data.targa);
  await modal.getByLabel("KM").fill(data.km);
  if (data.livelloCarburante) {
    const legacyPercent: Record<string, number> = {
      Vuoto: 0,
      "1/4": 25,
      "1/2": 50,
      "3/4": 75,
      Pieno: 100,
    };
    const percent = legacyPercent[data.livelloCarburante] ?? Number.parseInt(data.livelloCarburante, 10);
    const slider = modal.getByRole("slider", { name: "Livello carburante" });
    await slider.scrollIntoViewIfNeeded();
    await slider.fill(String(percent));
  }

  await modal.getByLabel("Descrizione anomalia").fill(data.descrizioneAnomalia);

  await expect(modal.getByRole("combobox", { name: "Cliente", exact: true })).toHaveValue(data.cliente, {
    timeout: 15_000,
  });
  await expect(modal.getByRole("combobox", { name: "Marca attrezzatura", exact: true })).toHaveValue(
    data.marcaAttrezzatura,
    { timeout: 15_000 },
  );

  await waitForGlobalOptionsReady(modal);
  await flushModalComboboxes(modal);
}

/** Digita in Cliente e salva senza blur — regression iOS submit flush. */
export async function fillMinimalCreateAndSaveWithoutClienteBlur(
  page: Page,
  fixture: SchedaIngressoAuditFixture,
): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await expect(modal).toBeVisible();
  await waitForGlobalOptionsReady(modal);

  await expect(modal.getByRole("combobox", { name: "Cliente", exact: true })).toBeVisible({
    timeout: 45_000,
  });

  const clienteInput = modal.getByRole("combobox", { name: "Cliente", exact: true });
  await clienteInput.click();
  if ((await clienteInput.getAttribute("aria-readonly")) === "true") {
    await page.keyboard.type(fixture.ingresso.cliente, { delay: 15 });
  } else {
    await clienteInput.fill(fixture.ingresso.cliente);
  }
  const addClienteBtn = page.getByRole("button", {
    name: new RegExp(`Aggiungi.*${escapeRegExp(fixture.ingresso.cliente)}`, "i"),
  });
  if (await addClienteBtn.isVisible().catch(() => false)) {
    await addClienteBtn.click();
  }
  await expect(clienteInput).toHaveValue(fixture.ingresso.cliente, { timeout: 15_000 });

  await modal.getByLabel("Data ingresso").fill(fixture.ingresso.dataIngresso);

  await fillListCombobox(page, "Marca attrezzatura", fixture.ingresso.marcaAttrezzatura, modal);
  await dismissMezzoPromptIfOpen(page);

  const save = modal.getByRole("button", { name: "Salva lavorazione" });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeEnabled({ timeout: 15_000 });
  const schedaPersist = waitForSchedaPersist(page, { expectCliente: fixture.ingresso.cliente, timeoutMs: 120_000 });
  const createResponse = waitForLavorazioneCreate(page, 120_000);
  await modal.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
  });
  await expect(modal.getByRole("button", { name: "Salvataggio…" })).toBeVisible({ timeout: 20_000 });
  await Promise.all([createResponse, schedaPersist]);
  await expect(modal).toBeHidden({ timeout: 60_000 });
}

async function flushModalComboboxes(modal: Locator): Promise<void> {
  const combos = modal.getByRole("combobox");
  const count = await combos.count();
  for (let i = 0; i < count; i++) {
    await combos.nth(i).blur();
  }
}

export async function submitCreateLavorazione(page: Page): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await waitForGlobalOptionsReady(modal);
  await dismissMezzoPromptIfOpen(page);
  await flushModalComboboxes(modal);

  const save = modal.getByRole("button", { name: "Salva lavorazione" });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeEnabled({ timeout: 15_000 });

  const lavorazionePost = page.waitForResponse(
    (res) => res.url().includes("/rest/v1/lavorazioni") && res.request().method() === "POST" && res.ok(),
    { timeout: 120_000 },
  );
  await save.click();
  await lavorazionePost;
  if (await modal.isVisible().catch(() => false)) {
    await modal.getByRole("button", { name: "Chiudi" }).click();
  }
  await expect(modal).toBeHidden({ timeout: 30_000 });
}

export async function searchLavorazioneByToken(page: Page, token: string): Promise<void> {
  const search = page.getByRole("searchbox", { name: /cerca in lavorazioni/i });
  const listResponse = page.waitForResponse(
    (res) => res.url().includes("/rest/v1/lavorazioni") && res.request().method() === "GET" && res.ok(),
    { timeout: 60_000 },
  );
  await search.fill(token);
  await search.press("Enter");
  await listResponse.catch(() => undefined);
  const hit = page.getByText(token, { exact: false }).first();
  await hit.scrollIntoViewIfNeeded();
  await expect(hit).toBeVisible({ timeout: 30_000 });
}

export async function openSchedeHubForToken(page: Page, token: string): Promise<void> {
  const row = page.locator("tr").filter({ hasText: token }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: "Schede" }).click();
  await expect(hubDialog(page)).toBeVisible({ timeout: 20_000 });
}

export async function openIngressoEditorFromHub(page: Page): Promise<void> {
  const hub = hubDialog(page);
  await hub.getByRole("tab", { name: /Schede/i }).click();
  const section = hub.locator("section").filter({ hasText: "Scheda ingresso" });
  await section.getByRole("button", { name: "Modifica" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" })).toBeVisible();
}

export async function openLavorazioniEditorFromHub(page: Page): Promise<void> {
  const hub = hubDialog(page);
  await hub.getByRole("tab", { name: /Schede/i }).click();
  const section = hub.locator("section").filter({ hasText: "Scheda lavorazioni" });
  const modifica = section.getByRole("button", { name: "Modifica" });
  const crea = section.getByRole("button", { name: "Crea nuova" });
  if (await modifica.isVisible().catch(() => false)) {
    await modifica.click();
  } else {
    await crea.click();
  }
  await expect(hub.getByText("Identificazione macchina")).toBeVisible({ timeout: 15_000 });
}

export async function fillIdentificazioneMacchina(hub: Locator, value: string): Promise<void> {
  const input = hub.locator("label").filter({ hasText: "Identificazione macchina" }).locator("input");
  await input.scrollIntoViewIfNeeded();
  await input.fill(value);
  await expect(input).toHaveValue(value);
}

/** Seleziona addetto riga lavorazione in modo deterministico (prima opzione o valore esplicito). */
export async function fillAddettoRiga(hub: Locator, addettoName?: string): Promise<void> {
  const page = hub.page();
  const combo = hub.getByRole("combobox", { name: "Addetto riga lavorazione" });
  await combo.scrollIntoViewIfNeeded();
  if (addettoName?.trim()) {
    await fillListCombobox(page, "Addetto riga lavorazione", addettoName, hub);
    return;
  }
  await combo.click();
  const listbox = await listboxForCombobox(page, combo);
  const option = listbox.getByRole("option").or(page.getByRole("option")).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(combo).not.toHaveValue("", { timeout: 15_000 });
  await dismissComboboxDropdown(page, combo, hub);
  await expect(hub).toBeVisible();
}

export async function fillLavorazioniRigaPrima(
  hub: Locator,
  riga: { dataLavorazione: string; lavorazioniEffettuate: string; addettoOre: number },
  addettoName?: string,
): Promise<void> {
  const row = hub.locator("tbody tr").first();
  await row.getByLabel("Data").fill(riga.dataLavorazione);
  await row.locator("textarea").fill(riga.lavorazioniEffettuate);
  await fillAddettoRiga(hub, addettoName);
  await row.locator('input[type="number"]').fill(String(riga.addettoOre));
}

/** Click Salva scheda nel hub con attesa persistenza rete. */
export async function clickSalvaSchedaHub(hub: Locator): Promise<void> {
  const page = hub.page();
  const persist = waitForSchedaPersist(page);
  const btn = hub.getByRole("button", { name: "Salva scheda" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await persist;
}

/** Salva scheda ingresso edit modal con attesa persistenza. */
export async function clickSalvaSchedaIngressoEdit(
  editModal: Locator,
  options?: { confirmMezzoAnagrafica?: boolean },
): Promise<void> {
  const page = editModal.page();
  const persist = waitForSchedaPersist(page);
  const btn = editModal.getByRole("button", { name: "Salva scheda" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const confirm = mezzoAnagraficaConfirmDialog(page);
  if (options?.confirmMezzoAnagrafica ?? true) {
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.getByRole("button", { name: "Conferma e salva" }).click();
      await expect(confirm).toBeHidden({ timeout: 15_000 });
    }
  }
  await expect(btn).not.toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
  await Promise.all([
    persist,
    expect(btn).toBeEnabled({ timeout: 30_000 }),
  ]);
  await expect(editModal).not.toBeVisible({ timeout: 30_000 });
}

/** Dialog conferma modifiche anagrafica mezzo (save gate scheda ingresso). */
export function mezzoAnagraficaConfirmDialog(page: Page): Locator {
  return page.getByRole("dialog").filter({ hasText: "Aggiornamento anagrafica mezzo" });
}

export async function expectMezzoAnagraficaConfirmVisible(page: Page): Promise<void> {
  const dlg = mezzoAnagraficaConfirmDialog(page);
  await expect(dlg).toBeVisible({ timeout: 15_000 });
  await expect(dlg.getByText(/Sono state rilevate modifiche/)).toBeVisible();
}

export async function cancelMezzoAnagraficaConfirm(page: Page): Promise<void> {
  const dlg = mezzoAnagraficaConfirmDialog(page);
  await dlg.getByRole("button", { name: "Torna alla modifica" }).click();
  await expect(dlg).toBeHidden({ timeout: 10_000 });
}

export async function confirmMezzoAnagraficaChanges(page: Page): Promise<void> {
  const dlg = mezzoAnagraficaConfirmDialog(page);
  await dlg.getByRole("button", { name: "Conferma e salva" }).click();
  await expect(dlg).toBeHidden({ timeout: 15_000 });
}

/** Dialog conferma collegamento mezzo esistente (link gate). */
export function mezzoLinkConfirmDialog(page: Page): Locator {
  return page.getByRole("dialog").filter({ hasText: /Collega mezzo esistente|Mezzo compatibile trovato|Mezzo con identificativo certo/i });
}

export async function expectMezzoLinkConfirmHidden(page: Page): Promise<void> {
  await expect(mezzoLinkConfirmDialog(page)).toBeHidden({ timeout: 3_000 });
}

export async function expectMezzoLinkConfirmVisible(page: Page): Promise<void> {
  const dlg = mezzoLinkConfirmDialog(page);
  await expect(dlg).toBeVisible({ timeout: 15_000 });
  await expect(dlg.getByRole("button", { name: "Collega mezzo esistente" })).toBeVisible();
}

export function attachSchedaPayloadCapture(page: Page): {
  ingressoCampi: Array<Record<string, unknown>>;
  lavorazioneIds: string[];
} {
  const ingressoCampi: Array<Record<string, unknown>> = [];
  const lavorazioneIds: string[] = [];

  void page.route("**/rest/v1/scheda_lavorazione**", async (route) => {
    const req = route.request();
    if (req.method() === "POST" || req.method() === "PATCH") {
      try {
        const body = req.postDataJSON() as { contenuto?: { doc?: { campi?: Record<string, unknown> } } };
        const campi = body?.contenuto?.doc?.campi;
        if (campi && typeof campi === "object") ingressoCampi.push(campi);
      } catch {
        // ignore non-json
      }
    }
    await route.continue();
  });

  void page.route("**/rest/v1/lavorazioni**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      try {
        const body = req.postDataJSON() as { id?: string };
        if (body?.id) lavorazioneIds.push(body.id);
      } catch {
        // ignore
      }
    }
    await route.continue();
  });

  return { ingressoCampi, lavorazioneIds };
}
