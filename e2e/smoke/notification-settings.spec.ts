import { test, expect } from "@playwright/test";

test.describe("notification settings", () => {
  test("preferences API requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications/preferences");
    expect([401, 403]).toContain(res.status());
  });
});
