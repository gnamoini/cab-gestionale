"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Toolbar search/filter state boundary — riduce re-render tabella (Sprint 2). */
export type LavorazioniToolbarStateValue = {
  hasActiveClientFilters: boolean;
};

const LavorazioniToolbarStateContext = createContext<LavorazioniToolbarStateValue | null>(null);

export function LavorazioniToolbarStateProvider({
  value,
  children,
}: {
  value: LavorazioniToolbarStateValue;
  children: ReactNode;
}) {
  return <LavorazioniToolbarStateContext.Provider value={value}>{children}</LavorazioniToolbarStateContext.Provider>;
}

export function useLavorazioniToolbarState(): LavorazioniToolbarStateValue {
  const ctx = useContext(LavorazioniToolbarStateContext);
  if (!ctx) throw new Error("useLavorazioniToolbarState requires LavorazioniToolbarStateProvider");
  return ctx;
}
