"use client";

import { useEffect } from "react";

/** Avviso browser su refresh/chiusura tab quando un form ha modifiche non salvate. */
export function useBeforeUnloadWhenDirty(isDirty: boolean, message?: string): void {
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
