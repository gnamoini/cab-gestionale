"use client";

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

function prune(now: number) {
  for (const [k, ts] of recentFingerprints) {
    if (now - ts > DEDUP_MS) recentFingerprints.delete(k);
  }
}

function eventLabel(event: CabSyncEvent): string | null {
  if (event.type === "settings_updated") return null;
  const verb =
    event.type === "entity_created"
      ? "creata"
      : event.type === "entity_deleted"
        ? "eliminata"
        : "aggiornata";

  switch (event.entity) {
    case "lavorazioni":
      return `Lavorazione ${verb}`;
    case "scheda_lavorazione":
      return "Scheda ingresso/lavorazione aggiornata";
    case "movimenti_ricambi":
      return event.type === "entity_created" ? "Movimento magazzino registrato" : `Movimento magazzino ${verb}`;
    case "magazzino_ricambi":
      return event.type === "entity_updated" ? "Ricambio aggiornato" : `Ricambio ${verb}`;
    case "preventivi":
      return `Preventivo ${verb}`;
    case "mezzi":
      return `Mezzo ${verb}`;
    case "lavorazione_documents":
      return "Documento lavorazione aggiornato";
    case "documenti":
      return `Documento ${verb}`;
    case "support_notes":
      return "Nota supporto aggiornata";
    case "segnalazioni":
      return "Segnalazione aggiornata";
    case "log_modifiche":
    case "app_settings":
    default:
      return null;
  }
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
