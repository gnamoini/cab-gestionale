"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { GestionaleShellLayoutState } from "@/lib/ui/use-gestionale-shell-layout-sync";

const GestionaleShellLayoutContext = createContext<GestionaleShellLayoutState | null>(null);

const FALLBACK_STATE: GestionaleShellLayoutState = {
  tier: "mobile",
  contentWidth: 0,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isCompactShell: true,
};

export function GestionaleShellLayoutProvider({
  value,
  children,
}: {
  value: GestionaleShellLayoutState;
  children: ReactNode;
}) {
  return (
    <GestionaleShellLayoutContext.Provider value={value}>{children}</GestionaleShellLayoutContext.Provider>
  );
}

export function useGestionaleShellLayout(): GestionaleShellLayoutState {
  return useContext(GestionaleShellLayoutContext) ?? FALLBACK_STATE;
}
