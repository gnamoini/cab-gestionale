"use client";

import { useLayoutEffect, useRef } from "react";
import { registerOverlayBack } from "@/lib/ui/overlay-back-stack";

/**
 * Collega un overlay aperto allo stack Indietro (History API).
 * Alla chiusura programmatica sincronizza history senza doppia chiusura.
 */
export function useOverlayBackHandler(
  active: boolean,
  onClose: () => void,
  source?: string,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!active) return;
    return registerOverlayBack(() => onCloseRef.current(), source);
  }, [active, source]);
}
