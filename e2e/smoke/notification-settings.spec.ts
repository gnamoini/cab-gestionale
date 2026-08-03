import { test, expect } from "@playwright/test";

test.describe("notification settings", () => {
  test("preferences API requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications/preferences");
    expect([401, 403]).toContain(res.status());
  });

  test("outbox processor cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/notification-outbox-processor");
    expect(res.status()).toBe(401);
  });

  test("notifications health requires service context", async ({ request }) => {
    const res = await request.get("/api/admin/notifications/health");
    expect([401, 403, 500]).toContain(res.status());
  });
});
