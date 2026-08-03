"use client";

import { useEffect } from "react";
import { usePwaUpdateGuard } from "@/lib/pwa/pwa-update-guard";

/** Avviso browser su refresh/chiusura tab quando un form ha modifiche non salvate. */
export function useBeforeUnloadWhenDirty(isDirty: boolean, message?: string): void {
  usePwaUpdateGuard(isDirty, message);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // I browser moderni ignorano il testo custom; basta impostare returnValue.
      e.returnValue = message ?? "";
    }
    window.addEventListener("beforeunload", onBeforeUnload, { capture: true });
    return () => window.removeEventListener("beforeunload", onBeforeUnload, { capture: true });
  }, [isDirty, message]);
}
