"use client";

import { isCabSyncToastSuppressed } from "@/lib/notifications/cab-sync-toast-suppress";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import type { CabToastTone } from "@/context/toast-context";

export type GestionaleNotification = {
  message: string;
  tone: CabToastTone;
  fingerprint: string;
  event: CabSyncEvent;
};

type Listener = (notification: GestionaleNotification) => void;

const listeners = new Set<Listener>();
const recentFingerprints = new Map<string, number>();
const DEDUP_MS = 5000;
const BUCKET_MS = 3000;

const REMOTE_SUFFIX = " da un altro dispositivo";

function prune(now: number) {
  for (const [k, ts] of recentFingerprints) {
    if (now - ts > DEDUP_MS) recentFingerprints.delete(k);
  }
}

function entityVerb(event: CabSyncEvent): string | null {
  if (event.type === "entity_created") return "creato";
  if (event.type === "entity_deleted") return "eliminato";
  if (event.type === "entity_updated") return "aggiornato";
  return null;
}

function feminineEntityVerb(event: CabSyncEvent): string | null {
  if (event.type === "entity_created") return "creata";
  if (event.type === "entity_deleted") return "eliminata";
  if (event.type === "entity_updated") return "aggiornata";
  return null;
}

/** Messaggio toast per evento cab-sync (null = nessun toast). Esportato per test copy. */
export function gestionaleCabSyncToastMessage(event: CabSyncEvent): string | null {
  if (event.type === "settings_updated") return null;
  if (event.entity === "lavorazioni" && event.type === "entity_created") return null;
  /** Promemoria: feedback utente solo via toast locali in DashboardPromemoriaSection. */
  if (event.entity === "dashboard_promemoria") return null;

  switch (event.entity) {
    case "lavorazioni": {
      const verb = feminineEntityVerb(event);
      return verb ? `Lavorazione ${verb}${REMOTE_SUFFIX}` : null;
    }
    case "scheda_lavorazione":
      if (event.type !== "entity_updated") return null;
      return `Scheda lavorazione aggiornata${REMOTE_SUFFIX}`;
    case "movimenti_ricambi":
      if (event.type === "entity_created") return "Movimento magazzino registrato";
      {
        const verb = entityVerb(event);
        return verb ? `Movimento magazzino ${verb}${REMOTE_SUFFIX}` : null;
      }
    case "magazzino_ricambi": {
      const verb = entityVerb(event);
      return verb ? `Ricambio ${verb}${REMOTE_SUFFIX}` : null;
    }
    case "preventivi": {
      const verb = entityVerb(event);
      return verb ? `Preventivo ${verb}${REMOTE_SUFFIX}` : null;
    }
    case "mezzi": {
      const verb = entityVerb(event);
      return verb ? `Mezzo ${verb}${REMOTE_SUFFIX}` : null;
    }
    case "lavorazione_documents":
      if (event.type === "entity_created") return `Documento lavorazione caricato${REMOTE_SUFFIX}`;
      if (event.type === "entity_updated") return `Documento lavorazione aggiornato${REMOTE_SUFFIX}`;
      if (event.type === "entity_deleted") return `Documento lavorazione eliminato${REMOTE_SUFFIX}`;
      return null;
    case "documenti": {
      const verb = entityVerb(event);
      return verb ? `Documento ${verb}${REMOTE_SUFFIX}` : null;
    }
    case "log_modifiche":
    case "app_settings":
    default:
      return null;
  }
}

function eventLabel(event: CabSyncEvent): string | null {
  return gestionaleCabSyncToastMessage(event);
}

function toneForEvent(event: CabSyncEvent): CabToastTone {
  if (event.type === "entity_deleted") return "warning";
  if (event.type === "entity_created") return "success";
  return "info";
}

function fingerprintForEvent(event: CabSyncEvent, now: number): string {
  const bucket = Math.floor(now / BUCKET_MS);
  if (event.type === "settings_updated") return `settings_updated:${bucket}`;
  return `${event.entity}:${event.type}:${event.id}:${bucket}`;
}

/**
 * Single source of truth per notifiche operative.
 * Usare solo questo dispatcher per creare notifiche da eventi gestionale.
 */
export function dispatchNotificaGestionale(event: CabSyncEvent): void {
  if (isCabSyncToastSuppressed(event)) return;
  const message = eventLabel(event);
  if (!message) return;
  const now = Date.now();
  prune(now);
  const fingerprint = fingerprintForEvent(event, now);
  if (recentFingerprints.has(fingerprint)) return;
  recentFingerprints.set(fingerprint, now);
  const notification: GestionaleNotification = {
    message,
    tone: toneForEvent(event),
    fingerprint,
    event,
  };
  for (const listener of listeners) {
    try {
      listener(notification);
    } catch {
      // no-op
    }
  }
}

export function subscribeNotificheGestionale(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
