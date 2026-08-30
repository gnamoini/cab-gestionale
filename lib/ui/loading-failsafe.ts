"use client";

import { useEffect, useRef, useState } from "react";

/** Allineato a RbacPageGuard — sblocca gate permessi sezione. */
export const SECTION_LOADING_FAILSAFE_MS = 8_000;

/** Liste domain — skeleton → errore con retry. */
export const LIST_QUERY_LOADING_FAILSAFE_MS = 10_000;

/** Hub modals — sub-query composite. */
export const HUB_QUERY_LOADING_FAILSAFE_MS = 10_000;

/**
 * Dopo `timeoutMs` con `active` true, restituisce true (mirror pattern RbacPageGuard).
 */
export function useLoadingFailsafe(active: boolean, timeoutMs: number): boolean {
  const [failsafe, setFailsafe] = useState(false);
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startedRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset failsafe when loading ends
      setFailsafe(false);
      return;
    }
    if (startedRef.current == null) {
      startedRef.current = Date.now();
    }
    const elapsed = Date.now() - startedRef.current;
    const remaining = Math.max(0, timeoutMs - elapsed);
    const id = window.setTimeout(() => setFailsafe(true), remaining);
    return () => window.clearTimeout(id);
  }, [active, timeoutMs]);

  return failsafe;
}

/** True se `pending` resta true oltre `timeoutMs`. */
export function usePendingQueryTimeout(pending: boolean, timeoutMs: number): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pending) {
      startedRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset timeout flag when query completes
      setTimedOut(false);
      return;
    }
    if (startedRef.current == null) {
      startedRef.current = Date.now();
    }
    const elapsed = Date.now() - startedRef.current;
    const remaining = Math.max(0, timeoutMs - elapsed);
    const id = window.setTimeout(() => setTimedOut(true), remaining);
    return () => window.clearTimeout(id);
  }, [pending, timeoutMs]);

  return timedOut;
}
