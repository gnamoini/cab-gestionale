import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";

export type GestionaleNotificaSource = "local_mutation" | "realtime" | "broadcast" | "reconnect";

/** Chiave stabile per confrontare eventi espliciti vs sintetici (collectCabEvents). */
export function cabSyncEventNotificaKey(ev: CabSyncEvent): string {
  if (ev.type === "settings_updated") return "settings_updated";
  return `${ev.entity}:${ev.type}:${ev.id}`;
}

/**
 * Toast solo per eventi passati dal chiamante (`cabSyncEvents`).
 * Gli eventi sintetici (es. `lavorazioni` in invalidate magazzino) restano per sync/cache.
 */
export function shouldDispatchNotificaForCabEvent(
  ev: CabSyncEvent,
  explicitCabEvents: CabSyncEvent[] | undefined,
): boolean {
  const explicit = explicitCabEvents ?? [];
  if (ev.type === "settings_updated") {
    return explicit.some((e) => e.type === "settings_updated");
  }
  if (explicit.length > 0) {
    const key = cabSyncEventNotificaKey(ev);
    return explicit.some((e) => e.type !== "settings_updated" && cabSyncEventNotificaKey(e) === key);
  }
  return Boolean(ev.id);
}

/** Toast remoto solo per cambiamenti genuinamente esterni (non mutazione locale / eco Realtime). */
export function shouldDispatchNotificaForGestionaleAction(
  ev: CabSyncEvent,
  explicitCabEvents: CabSyncEvent[] | undefined,
  source: GestionaleNotificaSource,
): boolean {
  if (!shouldDispatchNotificaForCabEvent(ev, explicitCabEvents)) return false;
  if (source === "local_mutation") return false;
  if (ev.type === "settings_updated") return false;
  const table = ev.table;
  if (table && shouldSuppressRemoteCacheInvalidation(table, ev.id || undefined)) {
    return false;
  }
  return true;
}
