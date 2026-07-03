"use client";

import { useEffect, useRef } from "react";
import {
  registerOverlayBack,
  type OverlayCloseContext,
  type RegisterOverlayBackOptions,
} from "@/lib/ui/overlay-back-stack";

/**
 * Collega un overlay aperto allo stack Indietro (History API).
 * Alla chiusura programmatica sincronizza history senza doppia chiusura.
 */
export function useOverlayBackHandler(
  active: boolean,
  onClose: (ctx?: OverlayCloseContext) => void,
  source?: string,
  opts?: RegisterOverlayBackOptions,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    let cleanup: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      cleanup = registerOverlayBack((ctx) => onCloseRef.current(ctx), source, opts);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cleanup?.();
    };
  }, [active, source, opts?.layer]);
}
