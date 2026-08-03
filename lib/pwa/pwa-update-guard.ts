"use client";

import { useEffect, useId } from "react";

export type PwaUpdateGuard = {
  id: string;
  isDirty: () => boolean;
  message?: string;
};

const guards = new Map<string, PwaUpdateGuard>();

export function registerPwaUpdateGuard(guard: PwaUpdateGuard): () => void {
  guards.set(guard.id, guard);
  return () => {
    if (guards.get(guard.id) === guard) guards.delete(guard.id);
  };
}

export function getPwaUpdateBlockReason(): string | null {
  for (const guard of guards.values()) {
    try {
      if (guard.isDirty()) {
        return guard.message ?? "Salva o chiudi le modifiche non salvate prima di aggiornare l'app.";
      }
    } catch {
      return "Impossibile verificare le modifiche non salvate. Salva o chiudi il form prima di aggiornare l'app.";
    }
  }
  return null;
}

export function usePwaUpdateGuard(isDirty: boolean, message?: string): void {
  const id = useId();

  useEffect(() => {
    if (!isDirty) return;
    return registerPwaUpdateGuard({
      id,
      isDirty: () => isDirty,
      message,
    });
  }, [id, isDirty, message]);
}

export function resetPwaUpdateGuardsForTests(): void {
  guards.clear();
}
