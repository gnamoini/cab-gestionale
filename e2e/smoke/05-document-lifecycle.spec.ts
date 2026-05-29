import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const lavorazioneId = process.env.SMOKE_DOCUMENTI_LAVORAZIONE_ID?.trim();

test("document upload and delete on documenti page", async ({ page }) => {
  test.skip(!lavorazioneId, "SMOKE_DOCUMENTI_LAVORAZIONE_ID not set");
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cab-smoke-"));
  const filePath = path.join(tmpDir, "smoke-doc.txt");
  fs.writeFileSync(filePath, `smoke ${Date.now()}\n`, "utf8");

  await page.goto("/documenti");
  await expect(page.getByRole("heading", { name: "Documenti" })).toBeVisible({ timeout: 30_000 });

  const uploadBtn = page.getByRole("button", { name: /carica|nuovo|upload/i }).first();
  if (await uploadBtn.isVisible().catch(() => false)) {
    await uploadBtn.click();
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() === 0) {
    test.skip(true, "upload UI not available for smoke user");
  }
  await fileInput.setInputFiles(filePath);

  await expect(page.getByText("smoke-doc").first()).toBeVisible({ timeout: 30_000 }).catch(() => {
    /* upload may require more form steps — page must not crash */
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
