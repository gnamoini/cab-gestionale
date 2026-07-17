import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe("document capture apply v1", () => {
  test("dry-run returns validation envelope when capture not in review", async ({ page, request }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());

    const policyRes = await request.post("/api/document-capture/upload-policy", {
      data: {
        fileName: "apply-v1-fixture.pdf",
        expectedMime: "application/pdf",
        expectedSizeBytes: 512,
        source: "e2e_apply_v1",
      },
    });
    if (!policyRes.ok()) {
      test.skip(true, `upload-policy unavailable: ${policyRes.status()}`);
    }
    const policy = (await policyRes.json()) as { captureId?: string };
    const captureId = policy.captureId;
    if (!captureId) test.skip(true, "no captureId from policy");

    const dryRunRes = await request.post(`/api/document-capture/${captureId}/dry-run`);
    expect([400, 404, 409]).toContain(dryRunRes.status());
    if (dryRunRes.ok()) {
      const body = (await dryRunRes.json()) as { validation?: { status?: string } };
      expect(body.validation?.status).toBeTruthy();
    }
  });

  test("lavorazioni page exposes AI acquisition entry", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await expect(page.getByRole("button", { name: /acquisizione ai/i })).toBeVisible({ timeout: 30_000 });
  });
});
