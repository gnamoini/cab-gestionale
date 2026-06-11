"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { deriveQuerySurface } from "@/lib/selector-core/derive-query-surface";
import type { QuerySurface } from "@/lib/selector-core/types";

export type UseSelectorQueryBridgeOptions = {
  clearQueryOnClose?: boolean;
};

export type UseSelectorQueryBridgeResult = {
  query: string;
  setQuery: (value: string) => void;
  triggerRef: RefObject<HTMLInputElement | null>;
  sheetSearchRef: RefObject<HTMLInputElement | null>;
  activeFocusRef: RefObject<HTMLElement | null>;
  onFocusIn: (el: HTMLElement) => void;
  deriveSurface: () => QuerySurface;
  resetQuery: () => void;
};

/**
 * Query SSOT + focus context per derivare query surface (mai state).
 */
export function useSelectorQueryBridge(
  opts: UseSelectorQueryBridgeOptions = {},
): UseSelectorQueryBridgeResult {
  const [query, setQueryState] = useState("");
  const triggerRef = useRef<HTMLInputElement | null>(null);
  const sheetSearchRef = useRef<HTMLInputElement | null>(null);
  const activeFocusRef = useRef<HTMLElement | null>(null);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  const onFocusIn = useCallback((el: HTMLElement) => {
    activeFocusRef.current = el;
  }, []);

  const deriveSurface = useCallback(
    () => deriveQuerySurface(activeFocusRef.current, sheetSearchRef.current),
    [],
  );

  const resetQuery = useCallback(() => {
    if (opts.clearQueryOnClose !== false) {
      setQueryState("");
    }
  }, [opts.clearQueryOnClose]);

  return {
    query,
    setQuery,
    triggerRef,
    sheetSearchRef,
    activeFocusRef,
    onFocusIn,
    deriveSurface,
    resetQuery,
  };
}
