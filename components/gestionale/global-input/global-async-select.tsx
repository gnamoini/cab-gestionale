"use client";

import { useEffect, useRef } from "react";
import { GlobalSelect, type GlobalSelectProps } from "@/components/gestionale/global-input/global-select";

export type GlobalAsyncSelectProps = GlobalSelectProps & {
  /** Ritardo prima di `onSearchQuery` (ms). */
  debounceMs?: number;
  /** Chiamato quando l'utente digita (per caricare opzioni remote). */
  onSearchQuery?: (query: string) => void;
};

export function GlobalAsyncSelect({
  debounceMs = 280,
  onSearchQuery,
  ...props
}: GlobalAsyncSelectProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueForQuery = "items" in props && props.items ? props.value : props.value;

  useEffect(() => {
    if (!onSearchQuery) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchQuery(valueForQuery), debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [valueForQuery, debounceMs, onSearchQuery]);

  return <GlobalSelect {...props} />;
}
