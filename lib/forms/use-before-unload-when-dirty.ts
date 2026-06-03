"use client";

import { useEffect } from "react";

/** Avviso browser su refresh/chiusura tab quando un form ha modifiche non salvate. */
export function useBeforeUnloadWhenDirty(isDirty: boolean, message?: string): void {
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = message ?? "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message]);
}
