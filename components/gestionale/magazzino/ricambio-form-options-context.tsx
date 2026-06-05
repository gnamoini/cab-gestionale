"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

type RicambioFormOptionsValue = ReturnType<typeof useGlobalOptions>;

const RicambioFormOptionsContext = createContext<RicambioFormOptionsValue | null>(null);

/** Un solo `useGlobalOptions` per tutto il form ricambio (evita 3 subscriber per keystroke). */
export function RicambioFormOptionsProvider({ children }: { children: ReactNode }) {
  const value = useGlobalOptions({ debugTag: "RicambioFormOptionsProvider" });
  return (
    <RicambioFormOptionsContext.Provider value={value}>{children}</RicambioFormOptionsContext.Provider>
  );
}

export function useRicambioFormOptions(): RicambioFormOptionsValue {
  const ctx = useContext(RicambioFormOptionsContext);
  if (!ctx) {
    throw new Error("useRicambioFormOptions must be used within RicambioFormOptionsProvider");
  }
  return ctx;
}
