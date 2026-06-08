import { expect, type Page } from "@playwright/test";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoAuditFixture } from "../fixtures/scheda-ingresso-test-data";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Combobox GlobalSelect / GlobalSettingsListSelect: digita e aggiungi all'elenco se necessario. */
export async function fillListCombobox(page: Page, ariaLabel: string, value: string): Promise<void> {
  const input = page.getByRole("combobox", { name: ariaLabel });
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.fill(value);
  const addBtn = page.getByRole("button", { name: new RegExp(`Aggiungi.*${escapeRegExp(value)}`, "i") });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await expect(input).toHaveValue(value, { timeout: 15_000 });
    return;
  }
  const option = page.getByRole("option", { name: new RegExp(escapeRegExp(value), "i") }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }
  await input.press("Enter");
}

export async function fillSchedaIngressoCreateForm(
  page: Page,
  data: SchedaIngressoFields,
  options?: { skipClienteBlurTest?: boolean },
): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await expect(modal).toBeVisible();

  await modal.getByLabel("Data ingresso").fill(data.dataIngresso);

  await fillListCombobox(page, "Cliente", data.cliente);
  await fillListCombobox(page, "Cantiere", data.cantiere);
  await fillListCombobox(page, "Utilizzatore", data.utilizzatore);
  await page.getByLabel("Richiedente").fill(data.richiedente);

  await fillListCombobox(page, "Tipo attrezzatura", data.tipoAttrezzatura);
  await fillListCombobox(page, "Marca attrezzatura", data.marcaAttrezzatura);
  if (data.modelloAttrezzatura) {
    await fillListCombobox(page, "Modello attrezzatura", data.modelloAttrezzatura);
  }

  await page.getByRole("combobox", { name: /matricola/i }).fill(data.matricola);
  await page.getByLabel("N. scuderia").fill(data.nScuderia);

  await fillListCombobox(page, "Tipo telaio", data.tipoTelaio);
  await fillListCombobox(page, "Marca telaio", data.marcaTelaio);
  if (data.modelloTelaio) {
    await fillListCombobox(page, "Modello telaio", data.modelloTelaio);
  }

  await page.getByRole("combobox", { name: /targa/i }).fill(data.targa);
  await page.getByLabel("Ore lavoro").fill(data.oreLavoro);
  await page.getByLabel("KM").fill(data.km);
  await fillListCombobox(page, "Livello carburante", data.livelloCarburante);

  await modal.getByLabel("Descrizione anomalia").fill(data.descrizioneAnomalia);
  await modal.getByLabel("Note").fill(data.noteIntervento);

  if (!options?.skipClienteBlurTest) {
    // no-op: full form fill commits comboboxes via add/select
  }
}

/** Digita in Cliente e salva senza blur — regression iOS submit flush. */
export async function fillMinimalCreateAndSaveWithoutClienteBlur(
  page: Page,
  fixture: SchedaIngressoAuditFixture,
): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await expect(modal).toBeVisible();

  const clienteInput = page.getByRole("combobox", { name: "Cliente" });
  await clienteInput.click();
  await clienteInput.fill(fixture.ingresso.cliente);

  await fillListCombobox(page, "Marca attrezzatura", fixture.ingresso.marcaAttrezzatura);

  await clienteInput.focus();
  await modal.getByRole("button", { name: "Salva lavorazione" }).click();
}

export async function submitCreateLavorazione(page: Page): Promise<void> {
  const modal = page.getByRole("dialog").filter({ hasText: "Nuova lavorazione" });
  await modal.getByRole("button", { name: "Salva lavorazione" }).click();
  await expect(modal).not.toBeVisible({ timeout: 60_000 });
}

export async function searchLavorazioneByToken(page: Page, token: string): Promise<void> {
  const search = page.getByRole("searchbox", { name: /cerca in lavorazioni/i });
  await search.fill(token);
  await search.press("Enter");
  await expect(page.getByText(token, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
}

export async function openSchedeHubForToken(page: Page, token: string): Promise<void> {
  const row = page.locator("tr").filter({ hasText: token }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: "Schede" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Dettaglio lavorazione" })).toBeVisible({
    timeout: 20_000,
  });
}

export async function openIngressoEditorFromHub(page: Page): Promise<void> {
  const hub = page.getByRole("dialog");
  await hub.getByRole("tab", { name: /Schede/i }).click();
  const section = hub.locator("section").filter({ hasText: "Scheda ingresso" });
  await section.getByRole("button", { name: "Modifica" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda di ingresso" })).toBeVisible();
}

export async function openLavorazioniEditorFromHub(page: Page): Promise<void> {
  const hub = page.getByRole("dialog");
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
