import { test, expect } from "@playwright/test";

test.describe("PageActionMenu smoke", () => {
  test("trigger opens menu on lavorazioni", async ({ page }) => {
    await page.goto("/lavorazioni");
    const trigger = page.getByTestId("page-action-menu-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId("page-action-menu-item-new-lavorazione")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("page-action-menu-item-new-lavorazione")).toBeHidden();
  });
});
