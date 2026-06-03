import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import {
  notificationCreatedAt,
  notificationStoreKey,
  wrapLavorazioneNotification,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";

export type AdminNotificationStoreState = {
  lastSeenAt: string | null;
  items: Record<string, AdminDashboardNotification>;
};

/** Limite voci in localStorage — evita quota exceeded e liste infinite (fase 10 audit). */
export const ADMIN_NOTIFICATION_STORE_MAX_ITEMS = 150;

const STORAGE_PREFIX = "cab:admin-dashboard-notifications:";
const LEGACY_STORAGE_PREFIX = "cab:admin-lav-notifications:";

type StoreListener = (userId: string) => void;
const listeners = new Set<StoreListener>();

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function legacyStorageKey(userId: string): string {
  return `${LEGACY_STORAGE_PREFIX}${userId}`;
}

function normalizeItem(raw: unknown): AdminDashboardNotification | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "admin_dashboard_test") {
    const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `admin-test:${Date.now()}`;
    return {
      kind: "admin_dashboard_test",
      id,
      message: typeof obj.message === "string" ? obj.message : "Notifica di test",
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    };
  }

  if (obj.kind === "dipendenti_presenze_reminder") {
    const dateYmd = typeof obj.dateYmd === "string" ? obj.dateYmd.trim() : "";
    if (!dateYmd) return null;
    const id =
      typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `dip-presenze:${dateYmd}`;
    return {
      kind: "dipendenti_presenze_reminder",
      id,
      dateYmd,
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    };
  }

  if (obj.kind === "dashboard_promemoria_reminder") {
    const promemoriaId = typeof obj.promemoriaId === "string" ? obj.promemoriaId.trim() : "";
    const eventDateYmd = typeof obj.eventDateYmd === "string" ? obj.eventDateYmd.trim() : "";
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    if (!promemoriaId || !eventDateYmd || !title) return null;
    const id =
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim()
        : `promemoria:${promemoriaId}:${eventDateYmd}`;
    return {
      kind: "dashboard_promemoria_reminder",
      id,
      promemoriaId,
      eventDateYmd,
      title,
      message: typeof obj.message === "string" ? obj.message : title,
      description: typeof obj.description === "string" ? obj.description : null,
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    };
  }

  if (obj.kind === "magazzino_sotto_scorta") {
    const ricambioId = typeof obj.ricambioId === "string" ? obj.ricambioId.trim() : "";
    if (!ricambioId) return null;
    return {
      kind: "magazzino_sotto_scorta",
      id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : ricambioId,
      ricambioId,
      marca: typeof obj.marca === "string" ? obj.marca : "—",
      descrizione: typeof obj.descrizione === "string" ? obj.descrizione : "—",
      scorta: typeof obj.scorta === "number" ? obj.scorta : 0,
      scortaMinima: typeof obj.scortaMinima === "number" ? obj.scortaMinima : 0,
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    };
  }

  const lavorazioneId =
    typeof obj.lavorazioneId === "string"
      ? obj.lavorazioneId.trim()
      : typeof obj.id === "string"
        ? obj.id.trim()
        : "";
  if (!lavorazioneId) return null;

  const intent: NotificationIntent = {
    lavorazioneId,
    titolo: typeof obj.titolo === "string" ? obj.titolo : lavorazioneId,
    cliente: typeof obj.cliente === "string" ? obj.cliente : "",
    mezzo: typeof obj.mezzo === "string" ? obj.mezzo : "",
    targa: typeof obj.targa === "string" ? obj.targa : null,
    createdBy: typeof obj.createdBy === "string" ? obj.createdBy : null,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
  };
  return wrapLavorazioneNotification(intent);
}

function parseStoreItems(rawItems: unknown): Record<string, AdminDashboardNotification> {
  if (!rawItems || typeof rawItems !== "object") return {};
  const items: Record<string, AdminDashboardNotification> = {};
  for (const [key, value] of Object.entries(rawItems as Record<string, unknown>)) {
    const item = normalizeItem(value);
    if (!item) continue;
    items[notificationStoreKey(item)] = item;
  }
  return items;
}

function migrateLegacyStore(userId: string): AdminNotificationStoreState | null {
  if (typeof window === "undefined" || !userId.trim()) return null;
  try {
    const raw = window.localStorage.getItem(legacyStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminNotificationStoreState;
    if (!parsed || typeof parsed !== "object") return null;
    const migrated: AdminNotificationStoreState = {
      lastSeenAt: typeof parsed.lastSeenAt === "string" ? parsed.lastSeenAt : null,
      items: parseStoreItems(parsed.items),
    };
    saveAdminNotificationStore(userId, migrated);
    window.localStorage.removeItem(legacyStorageKey(userId));
    return migrated;
  } catch {
    return null;
  }
}

export function emptyAdminNotificationStore(): AdminNotificationStoreState {
  return { lastSeenAt: null, items: {} };
}

export function loadAdminNotificationStore(userId: string): AdminNotificationStoreState {
  if (typeof window === "undefined" || !userId.trim()) return emptyAdminNotificationStore();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return migrateLegacyStore(userId) ?? emptyAdminNotificationStore();
    }
    const parsed = JSON.parse(raw) as AdminNotificationStoreState;
    if (!parsed || typeof parsed !== "object" || !parsed.items) return emptyAdminNotificationStore();
    return {
      lastSeenAt: typeof parsed.lastSeenAt === "string" ? parsed.lastSeenAt : null,
      items: parseStoreItems(parsed.items),
    };
  } catch {
    return emptyAdminNotificationStore();
  }
}

export function saveAdminNotificationStore(userId: string, state: AdminNotificationStoreState): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  for (const fn of listeners) {
    try {
      fn(userId);
    } catch {
      /* ignore */
    }
  }
}

export function isNotificationUnread(
  state: AdminNotificationStoreState,
  notification: AdminDashboardNotification,
): boolean {
  if (!state.lastSeenAt) return true;
  const seen = new Date(state.lastSeenAt).getTime();
  const created = new Date(notificationCreatedAt(notification)).getTime();
  if (Number.isNaN(seen) || Number.isNaN(created)) return true;
  return created > seen;
}

export function getUnreadCount(state: AdminNotificationStoreState): number {
  return listNotifications(state).filter((item) => isNotificationUnread(state, item)).length;
}

export function listNotifications(state: AdminNotificationStoreState): AdminDashboardNotification[] {
  return Object.values(state.items).sort(
    (a, b) => new Date(notificationCreatedAt(b)).getTime() - new Date(notificationCreatedAt(a)).getTime(),
  );
}

function pruneNotificationStoreItems(state: AdminNotificationStoreState): AdminNotificationStoreState {
  const count = Object.keys(state.items).length;
  if (count <= ADMIN_NOTIFICATION_STORE_MAX_ITEMS) return state;

  const dropCount = count - ADMIN_NOTIFICATION_STORE_MAX_ITEMS;
  const oldestFirst = [...listNotifications(state)].sort(
    (a, b) => new Date(notificationCreatedAt(a)).getTime() - new Date(notificationCreatedAt(b)).getTime(),
  );
  const items = { ...state.items };
  let dropped = 0;

  for (const notification of oldestFirst) {
    if (dropped >= dropCount) break;
    if (isNotificationUnread(state, notification)) continue;
    delete items[notificationStoreKey(notification)];
    dropped++;
  }

  if (dropped < dropCount) {
    for (const notification of oldestFirst) {
      if (dropped >= dropCount) break;
      const key = notificationStoreKey(notification);
      if (!items[key]) continue;
      delete items[key];
      dropped++;
    }
  }

  return { ...state, items };
}

/** Garantisce che un nuovo inserimento risulti non letto anche se createdAt coincide con lastSeenAt (stesso ms). */
function withCreatedAtAfterLastSeen(
  state: AdminNotificationStoreState,
  notification: AdminDashboardNotification,
): AdminDashboardNotification {
  if (!state.lastSeenAt) return notification;
  const seen = new Date(state.lastSeenAt).getTime();
  const created = new Date(notificationCreatedAt(notification)).getTime();
  if (Number.isNaN(seen) || Number.isNaN(created) || created > seen) return notification;
  const bumped = new Date(seen + 1).toISOString();
  return { ...notification, createdAt: bumped };
}

export function upsertAdminNotification(
  userId: string,
  notification: AdminDashboardNotification,
): AdminNotificationStoreState {
  const state = loadAdminNotificationStore(userId);
  const key = notificationStoreKey(notification);
  if (state.items[key]) return state;
  const item = withCreatedAtAfterLastSeen(state, notification);
  const next: AdminNotificationStoreState = {
    ...state,
    items: { ...state.items, [key]: item },
  };
  const pruned = pruneNotificationStoreItems(next);
  saveAdminNotificationStore(userId, pruned);
  return pruned;
}

export function markAllAdminNotificationsRead(userId: string): AdminNotificationStoreState {
  const state = loadAdminNotificationStore(userId);
  const next: AdminNotificationStoreState = {
    ...state,
    lastSeenAt: new Date().toISOString(),
  };
  saveAdminNotificationStore(userId, next);
  return next;
}

export function removeAdminNotification(
  userId: string,
  notification: AdminDashboardNotification,
): AdminNotificationStoreState {
  const state = loadAdminNotificationStore(userId);
  const key = notificationStoreKey(notification);
  if (!state.items[key]) return state;
  const items = { ...state.items };
  delete items[key];
  const next: AdminNotificationStoreState = { ...state, items };
  saveAdminNotificationStore(userId, next);
  return next;
}

export function removeReadAdminNotifications(userId: string): AdminNotificationStoreState {
  const state = loadAdminNotificationStore(userId);
  const items: Record<string, AdminDashboardNotification> = {};
  for (const [key, item] of Object.entries(state.items)) {
    if (isNotificationUnread(state, item)) {
      items[key] = item;
    }
  }
  const next: AdminNotificationStoreState = { ...state, items };
  saveAdminNotificationStore(userId, next);
  return next;
}

export function countReadAdminNotifications(state: AdminNotificationStoreState): number {
  return listNotifications(state).filter((item) => !isNotificationUnread(state, item)).length;
}

export function clearMagazzinoNotifications(userId: string): AdminNotificationStoreState {
  const state = loadAdminNotificationStore(userId);
  const items: Record<string, AdminDashboardNotification> = {};
  for (const [key, item] of Object.entries(state.items)) {
    if (item.kind !== "magazzino_sotto_scorta") items[key] = item;
  }
  const next: AdminNotificationStoreState = { ...state, items };
  saveAdminNotificationStore(userId, next);
  return next;
}

export function subscribeAdminNotificationStore(listener: StoreListener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith(STORAGE_PREFIX)) {
        listener(e.key.slice(STORAGE_PREFIX.length));
        return;
      }
      if (e.key.startsWith(LEGACY_STORAGE_PREFIX)) {
        listener(e.key.slice(LEGACY_STORAGE_PREFIX.length));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(listener);
}
