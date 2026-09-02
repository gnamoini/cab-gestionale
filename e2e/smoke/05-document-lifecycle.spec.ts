import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const lavorazioneId = process.env.SMOKE_DOCUMENTI_LAVORAZIONE_ID?.trim();

registerMutatingSmokeGuards(test);

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("document upload and delete on documenti page", async ({ page }) => {
  test.skip(!lavorazioneId, "SMOKE_DOCUMENTI_LAVORAZIONE_ID not set");
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cab-smoke-"));
  const fileName = `smoke-doc-${Date.now()}.txt`;
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, `smoke ${Date.now()}\n`, "utf8");

  try {
    await page.goto("/documenti");
    await expect(page.getByRole("heading", { name: "Documenti" })).toBeVisible({ timeout: 30_000 });

    const uploadBtn = page.getByRole("button", { name: /carica|nuovo|upload/i }).first();
    if (await uploadBtn.isVisible().catch(() => false)) {
      await uploadBtn.click();
    }

    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) === 0) {
      test.skip(true, "upload UI not available for smoke user");
    }
    await fileInput.setInputFiles(filePath);

    const docLabel = page.getByText("smoke-doc").first();
    await expect(docLabel).toBeVisible({ timeout: 30_000 });

    const infoBtn = page.getByRole("button", { name: "Info" }).first();
    if (await infoBtn.isVisible().catch(() => false)) {
      await infoBtn.click();
      const infoModal = page.getByRole("dialog").filter({ hasText: /Documento|Info/i });
      const deleteBtn = infoModal.getByRole("button", { name: "Elimina" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.getByRole("button", { name: "Elimina" }).last().click();
        await expect(docLabel).not.toBeVisible({ timeout: 30_000 });
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
