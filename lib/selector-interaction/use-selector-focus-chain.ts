"use client";

import { useCallback, useEffect, type RefObject } from "react";

export type UseSelectorFocusChainParams = {
  sheetOpen: boolean;
  sheetSearchRef: RefObject<HTMLInputElement | null>;
  triggerRef: RefObject<HTMLInputElement | null>;
  onFocusIn: (el: HTMLElement) => void;
  onSearchFocus?: () => void;
};

/** Autofocus sheet search e aggiorna activeFocusRef. */
export function useSelectorFocusChain({
  sheetOpen,
  sheetSearchRef,
  triggerRef,
  onFocusIn,
  onSearchFocus,
}: UseSelectorFocusChainParams): () => void {
  const captureTriggerFocus = useCallback(() => {
    if (triggerRef.current) onFocusIn(triggerRef.current);
  }, [triggerRef, onFocusIn]);

  useEffect(() => {
    if (!sheetOpen) return;
    const t = window.setTimeout(() => {
      const input = sheetSearchRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      onFocusIn(input);
      onSearchFocus?.();
      try {
        input.setSelectionRange(0, 0);
      } catch {
        /* type=search */
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [sheetOpen, sheetSearchRef, onFocusIn, onSearchFocus]);

  return captureTriggerFocus;
}
