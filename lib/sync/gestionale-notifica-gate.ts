import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";

export type GestionaleNotificaSource = "local_mutation" | "realtime" | "broadcast" | "reconnect";

/** Chiave stabile per confrontare eventi espliciti vs sintetici (collectCabEvents). */
export function cabSyncEventNotificaKey(ev: CabSyncEvent): string {
  if (ev.type === "settings_updated") return "settings_updated";
  if (ev.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") {
    return `settings_propagation_drift:${ev.kind}:${ev.jobId ?? ev.oldLabel}:${ev.newLabel}`;
  }
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
  if (ev.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") {
    return explicit.some((e) => e.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED");
  }
  if (explicit.length > 0) {
    const key = cabSyncEventNotificaKey(ev);
    return explicit.some(
      (e) =>
        e.type !== "settings_updated" &&
        e.type !== "SETTINGS_PROPAGATION_DRIFT_DETECTED" &&
        cabSyncEventNotificaKey(e) === key,
    );
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
  if (ev.type === "settings_updated" || ev.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") return false;
  const table = ev.table;
  if (table && shouldSuppressRemoteCacheInvalidation(table, ev.id || undefined)) {
    return false;
  }
  return true;
}
