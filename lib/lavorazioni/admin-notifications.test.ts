import assert from "node:assert/strict";
import {
  adminNotificationBadgeLabel,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  formatAdminNotificationDesktopBody,
  formatAdminNotificationToastMessage,
  formatMagazzinoSottoScortaToastMessage,
  shouldShowDesktopLavorazioneNotification,
  shouldShowLightLavorazioneAlert,
} from "@/lib/lavorazioni/admin-notifications";
import {
  clearMagazzinoNotifications,
  emptyAdminNotificationStore,
  getUnreadCount,
  isNotificationUnread,
  loadAdminNotificationStore,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  upsertAdminNotification,
  ADMIN_NOTIFICATION_STORE_MAX_ITEMS,
  __resetAdminNotificationStoreMemoryForTests,
} from "@/lib/lavorazioni/admin-notification-store";
import { formatNotificationRelativeTime } from "@/lib/lavorazioni/format-notification-relative-time";
import {
  lavorazioneCreatedEventToIntent,
  minimalNotificationIntent,
} from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { magazzinoCrossingToNotification } from "@/lib/magazzino/magazzino-sotto-scorta-notification-mapper";
import { wrapLavorazioneNotification } from "@/lib/notifications/admin-dashboard-notifications";

const USER = "admin-user-1";

assert.equal(adminNotificationBadgeLabel(0), null);
assert.equal(adminNotificationBadgeLabel(3), "3");
assert.equal(adminNotificationBadgeLabel(100), "99+");

assert.equal(buildAdminNotificationLavorazioneHref("abc"), "/lavorazioni?focusLav=abc");
assert.equal(buildAdminNotificationMagazzinoHref("ric-1"), "/magazzino?focusRicambio=ric-1");
assert.equal(shouldShowLightLavorazioneAlert("/magazzino"), true);
assert.equal(shouldShowLightLavorazioneAlert("/dashboard"), false);
assert.equal(shouldShowDesktopLavorazioneNotification("/lavorazioni"), false);

const event = { type: "entity_created" as const, entity: "lavorazioni" as const, id: "lav-1" };

const minimalDash = lavorazioneCreatedEventToIntent({
  event,
  pathname: "/dashboard",
  isLocalCreate: false,
});
assert.ok(minimalDash);
assert.equal(minimalDash?.lavorazioneId, "lav-1");
assert.equal(minimalDash?.titolo, "lav-1");

assert.equal(
  lavorazioneCreatedEventToIntent({
    event,
    pathname: "/dashboard",
    isLocalCreate: true,
  }),
  null,
);

assert.equal(
  lavorazioneCreatedEventToIntent({
    event,
    pathname: "/lavorazioni",
    isLocalCreate: false,
  }),
  null,
);

const intent = lavorazioneCreatedEventToIntent({
  event,
  pathname: "/magazzino",
  isLocalCreate: false,
  row: {
    id: "lav-1",
    codice: "26-0001",
    created_by: "other",
    created_at: "2026-01-10T10:00:00.000Z",
    mezzo: { cliente: "Rossi", marca: "Fiat", modello: "Ducato", targa: "AB123CD" },
  } as never,
});
assert.ok(intent);
assert.equal(intent?.cliente, "Rossi");

const msg = formatAdminNotificationToastMessage({
  cliente: "Rossi Srl",
  mezzo: "Fiat Ducato",
  targa: "AB123CD",
});
assert.ok(msg.includes("Rossi Srl"));

const body = formatAdminNotificationDesktopBody({
  cliente: "Rossi Srl",
  mezzo: "Fiat Ducato",
  targa: "AB123CD",
});
assert.ok(body.includes("Fiat Ducato"));

assert.ok(formatNotificationRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString()).length > 0);

// Store dedup + unread
const base = emptyAdminNotificationStore();
assert.equal(getUnreadCount(base), 0);

const i1 = minimalNotificationIntent("lav-a", "2026-01-15T10:00:00.000Z");
const i2 = minimalNotificationIntent("lav-a", "2026-01-15T11:00:00.000Z");

// upsert uses in-memory path via save - mock localStorage minimal
const storage = new Map<string, string>();
const g = globalThis as typeof globalThis & {
  localStorage?: Storage;
  window?: Window & typeof globalThis;
};

const mockStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storage.set(k, v);
  },
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
};

g.localStorage = mockStorage as Storage;
g.window = g as Window & typeof globalThis;
__resetAdminNotificationStoreMemoryForTests();

upsertAdminNotification(USER, wrapLavorazioneNotification(i1));
upsertAdminNotification(USER, wrapLavorazioneNotification(i2));
assert.equal(getUnreadCount(markAllAdminNotificationsRead(USER)), 0);

upsertAdminNotification(USER, wrapLavorazioneNotification(i1));
assert.equal(getUnreadCount(emptyAdminNotificationStore()), 0);
assert.ok(getUnreadCount({ lastSeenAt: null, items: { "lav:lav-a": wrapLavorazioneNotification(i1) } }) >= 1);

const magNotif = magazzinoCrossingToNotification({
  ricambioId: "ric-1",
  prev: { scorta: 10, scortaMinima: 5 },
  curr: { scorta: 3, scortaMinima: 5 },
  pathname: "/dashboard",
  ricambio: {
    id: "ric-1",
    marca: "Bosch",
    descrizione: "Filtro",
    scorta: 3,
    scortaMinima: 5,
  } as never,
});
assert.ok(magNotif);
assert.equal(magNotif?.kind, "magazzino_sotto_scorta");

assert.equal(
  magazzinoCrossingToNotification({
    ricambioId: "ric-1",
    prev: { scorta: 3, scortaMinima: 5 },
    curr: { scorta: 2, scortaMinima: 5 },
    pathname: "/dashboard",
  }),
  null,
);

assert.equal(
  magazzinoCrossingToNotification({
    ricambioId: "ric-1",
    prev: { scorta: 10, scortaMinima: 5 },
    curr: { scorta: 3, scortaMinima: 5 },
    pathname: "/magazzino",
  }),
  null,
);

upsertAdminNotification(USER, magNotif!);
assert.equal(getUnreadCount(loadAdminNotificationStore(USER)), 1);
assert.equal(loadAdminNotificationStore(USER), loadAdminNotificationStore(USER));

const cleared = clearMagazzinoNotifications(USER);
assert.equal(Object.keys(cleared.items).length, 1);
assert.ok(cleared.items["lav:lav-a"]);
assert.equal(getUnreadCount(cleared), 0);

const magToast = formatMagazzinoSottoScortaToastMessage({
  descrizione: "Filtro",
  codice: "FH-1",
  scorta: 3,
  scortaMinima: 5,
});
assert.ok(magToast.includes("Filtro"));
assert.ok(magToast.includes("Disponibili: 3"));
assert.ok(magToast.includes("Soglia minima: 5"));

// Store cap (fase 10)
for (let i = 0; i < ADMIN_NOTIFICATION_STORE_MAX_ITEMS + 5; i++) {
  upsertAdminNotification(
    USER,
    wrapLavorazioneNotification(minimalNotificationIntent(`lav-cap-${i}`, `2026-01-15T10:${String(i % 60).padStart(2, "0")}:00.000Z`)),
  );
}
assert.ok(Object.keys(loadAdminNotificationStore(USER).items).length <= ADMIN_NOTIFICATION_STORE_MAX_ITEMS);

const older = wrapLavorazioneNotification(minimalNotificationIntent("lav-old", "2026-01-10T10:00:00.000Z"));
const newer = wrapLavorazioneNotification(minimalNotificationIntent("lav-new", "2026-01-12T10:00:00.000Z"));
__resetAdminNotificationStoreMemoryForTests();
storage.clear();
upsertAdminNotification(USER, older);
upsertAdminNotification(USER, newer);
const afterSingleRead = markAdminNotificationRead(USER, older);
assert.equal(isNotificationUnread(afterSingleRead, older), false);
assert.equal(isNotificationUnread(afterSingleRead, newer), true);

console.log("admin-notifications.test.ts OK");
