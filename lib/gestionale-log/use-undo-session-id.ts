"use client";

import { useSyncExternalStore } from "react";
import { getOrCreateUndoSessionId } from "@/lib/gestionale-log/undo-session";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return getOrCreateUndoSessionId();
}

/** Id sessione undo corrente (si aggiorna al login/logout). */
export function useUndoSessionId(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => "");
}

export function notifyUndoSessionChanged(): void {
  listeners.forEach((l) => l());
}
