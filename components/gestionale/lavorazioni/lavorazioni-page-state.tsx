"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Modal / drawer open state — isolato dal table render tree (Sprint 2 state split). */
export type LavorazioniModalStateValue = {
  schedeOpen: boolean;
};

const LavorazioniModalStateContext = createContext<LavorazioniModalStateValue | null>(null);

export function LavorazioniModalStateProvider({
  value,
  children,
}: {
  value: LavorazioniModalStateValue;
  children: ReactNode;
}) {
  return <LavorazioniModalStateContext.Provider value={value}>{children}</LavorazioniModalStateContext.Provider>;
}

export function useLavorazioniModalState(): LavorazioniModalStateValue {
  const ctx = useContext(LavorazioniModalStateContext);
  if (!ctx) throw new Error("useLavorazioniModalState requires LavorazioniModalStateProvider");
  return ctx;
}
