import { test, expect } from "@playwright/test";

/**
 * Matrice multi-device — scenari documentati per QA manuale / device farm.
 * In CI verifichiamo solo contratti API e routing push SSOT.
 */
test.describe("notification push multi-device matrix", () => {
  test("push routing resolves lavorazione deep link", async () => {
    const { resolvePushHrefFromNotification } = await import("@/lib/pwa/push-routing");
    expect(resolvePushHrefFromNotification({ type: "lavorazione_created", entity_id: "abc" })).toContain(
      "abc",
    );
  });

  test("push routing resolves preventivo deep link", async () => {
    const { resolvePushHrefFromNotification } = await import("@/lib/pwa/push-routing");
    expect(resolvePushHrefFromNotification({ type: "preventivo_approvato", entity_id: "p1" })).toBe(
      "/preventivi",
    );
  });

  test("template registry covers catalog types", async () => {
    const { NOTIFICATION_TYPES } = await import("@/lib/notifications/notification-types");
    const { getNotificationTemplate } = await import(
      "@/lib/notifications/templates/notification-template-registry"
    );
    for (const type of NOTIFICATION_TYPES) {
      expect(getNotificationTemplate(type)?.deep_link_pattern).toBeTruthy();
    }
  });
});

/**
 * Scenari manuali (documentazione test plan):
 * - 2 browser desktop (Chrome + Firefox): inbox sync + badge
 * - Desktop + Android: push PWA chiusa
 * - Desktop + iPhone PWA installata
 * - Android + Android / Android + iPhone: stesso utente, badge da DB unread
 */
