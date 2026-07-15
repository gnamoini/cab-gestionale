"use client";

import { useCallback, type RefObject } from "react";

export type UseSelectorFocusChainParams = {
  sheetOpen: boolean;
  sheetSearchRef: RefObject<HTMLInputElement | null>;
  triggerRef: RefObject<HTMLInputElement | null>;
  onFocusIn: (el: HTMLElement) => void;
  onSearchFocus?: () => void;
};

/** Traccia focus trigger; tastiera sheet solo su tap esplicito del campo Cerca. */
export function useSelectorFocusChain({
  triggerRef,
  onFocusIn,
}: UseSelectorFocusChainParams): () => void {
  return useCallback(() => {
    if (triggerRef.current) onFocusIn(triggerRef.current);
  }, [triggerRef, onFocusIn]);
}
