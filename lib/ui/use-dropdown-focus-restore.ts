"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Salva l'elemento attivo all'apertura e lo ripristina alla chiusura del dropdown/sheet.
 */
export function useDropdownFocusRestore(open: boolean): {
  captureFocus: () => void;
  restoreFocus: () => void;
} {
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const captureFocus = useCallback(() => {
    const active = document.activeElement;
    previousActiveRef.current = active instanceof HTMLElement ? active : null;
  }, []);

  const restoreFocus = useCallback(() => {
    const el = previousActiveRef.current;
    previousActiveRef.current = null;
    if (!el || !document.contains(el)) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      /* elemento non focusable */
    }
  }, []);

  useEffect(() => {
    if (open) captureFocus();
  }, [open, captureFocus]);

  return { captureFocus, restoreFocus };
}
