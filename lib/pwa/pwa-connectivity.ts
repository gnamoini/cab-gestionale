import { onlineManager } from "@tanstack/react-query";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

export const PWA_OFFLINE_WRITE_MESSAGE = GESTIONALE_TOAST.offlineWriteBlocked;

export const PWA_OFFLINE_WRITE_BLOCKED = "PWA_OFFLINE_WRITE_BLOCKED" as const;

export type PwaConnectivityState = {
  online: boolean;
};

let offlineWriteNotifier: ((message: string) => void) | null = null;

export function registerPwaOfflineWriteNotifier(
  notifier: ((message: string) => void) | null,
): void {
  offlineWriteNotifier = notifier;
}

/** Legge stato rete da onlineManager RQ — nessun listener proprio. */
export function readPwaConnectivityState(): PwaConnectivityState {
  return { online: onlineManager.isOnline() };
}

/** Subscribe a cambi onlineManager — nessun window online/offline aggiuntivo. */
export function subscribePwaConnectivity(onStoreChange: () => void): () => void {
  return onlineManager.subscribe(onStoreChange);
}

/** Blocca scritture offline — toast SSOT + errore controllato. */
export function assertOnlineForWrite(): void {
  if (readPwaConnectivityState().online) return;
  offlineWriteNotifier?.(PWA_OFFLINE_WRITE_MESSAGE);
  const error = new Error(PWA_OFFLINE_WRITE_BLOCKED);
  error.name = PWA_OFFLINE_WRITE_BLOCKED;
  throw error;
}
