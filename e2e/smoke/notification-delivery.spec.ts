import { test, expect } from "@playwright/test";

test.describe("notification delivery pipeline", () => {
  test("pipeline trace API requires auth", async ({ request }) => {
    const res = await request.post("/api/notifications/pipeline-trace", {
      data: { traceId: "00000000-0000-4000-8000-000000000001" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("outbox processor cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/notification-outbox-processor");
    expect(res.status()).toBe(401);
  });

  test("dispatch API requires auth", async ({ request }) => {
    const res = await request.post("/api/notifications/dispatch", {
      data: {
        notificationEventId: "lavorazioni.created",
        dispatchIdempotencyKey: "test:e2e:dispatch:auth",
        legacyNotification: { kind: "lavorazione_created", id: "x", lavorazioneId: "x" },
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("fatturazione overdue digest cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/fatturazione-overdue-digest");
    expect(res.status()).toBe(401);
  });

  test("lavorazioni overdue digest cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/lavorazioni-overdue-digest");
    expect(res.status()).toBe(401);
  });

  test("push subscription cleanup cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/push-subscription-cleanup");
    expect(res.status()).toBe(401);
  });

  test("push delivery cron requires auth", async ({ request }) => {
    const res = await request.get("/api/cron/push-delivery");
    expect(res.status()).toBe(401);
  });
});
