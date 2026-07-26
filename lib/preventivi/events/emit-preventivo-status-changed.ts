import type { PreventivoStatusChangedPayload } from "@/lib/preventivi/events/preventivo-status-changed";

export type PreventivoStatusChangedHandler = (event: PreventivoStatusChangedPayload) => void;

const handlers: PreventivoStatusChangedHandler[] = [];

export function onPreventivoStatusChanged(handler: PreventivoStatusChangedHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function emitPreventivoStatusChanged(payload: PreventivoStatusChangedPayload): void {
  for (const h of handlers) {
    try {
      h(payload);
    } catch (e) {
      console.warn("[preventivi] PreventivoStatusChanged handler error:", e);
    }
  }
}
