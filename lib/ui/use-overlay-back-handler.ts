"use client";

import { useLayoutEffect, useRef } from "react";
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

  useLayoutEffect(() => {
    if (!active) return;
    return registerOverlayBack((ctx) => onCloseRef.current(ctx), source, opts);
  }, [active, source, opts?.layer]);
}
