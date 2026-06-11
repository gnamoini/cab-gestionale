/**
 * Un solo subscriber visualViewport per tutte le GestionaleTextarea auto-grow.
 */
import { subscribeGestionaleViewport } from "@/lib/ui/gestionale-viewport-orchestrator";

const syncRegistry = new Set<() => void>();
let viewportSubscribed = false;

function runTextareaViewportSyncs(): void {
  for (const sync of syncRegistry) {
    sync();
  }
}

function ensureViewportSubscriber(): void {
  if (viewportSubscribed || typeof window === "undefined") return;
  viewportSubscribed = true;
  subscribeGestionaleViewport(runTextareaViewportSyncs);
}

/** Registra sync auto-grow; ritorna unsubscribe. */
export function registerGestionaleTextareaViewportSync(sync: () => void): () => void {
  syncRegistry.add(sync);
  ensureViewportSubscriber();
  return () => {
    syncRegistry.delete(sync);
  };
}
