"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { GestionaleShellTierState } from "@/lib/ui/use-gestionale-shell-layout-sync";
import { useGestionaleShellContentWidth } from "@/lib/ui/use-gestionale-shell-content-width";

const GestionaleShellTierContext = createContext<GestionaleShellTierState | null>(null);

const FALLBACK_TIER_STATE: GestionaleShellTierState = {
  tier: "mobile",
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isCompactShell: true,
};

export function GestionaleShellTierProvider({
  value,
  children,
}: {
  value: GestionaleShellTierState;
  children: ReactNode;
}) {
  return (
    <GestionaleShellTierContext.Provider value={value}>{children}</GestionaleShellTierContext.Provider>
  );
}

/** Tier shell (mobile/tablet/desktop) — non include contentWidth (CSS var + hook dedicato). */
export function useGestionaleShellTier(): GestionaleShellTierState {
  return useContext(GestionaleShellTierContext) ?? FALLBACK_TIER_STATE;
}

/** @deprecated Alias — preferire `useGestionaleShellTier` + `useGestionaleShellContentWidth`. */
export function useGestionaleShellLayout(): GestionaleShellTierState & { contentWidth: number } {
  const tier = useGestionaleShellTier();
  const contentWidth = useGestionaleShellContentWidth();
  return { ...tier, contentWidth };
}

/** @deprecated Usare `GestionaleShellTierProvider`. */
export const GestionaleShellLayoutProvider = GestionaleShellTierProvider;

export { useGestionaleShellContentWidth } from "@/lib/ui/use-gestionale-shell-content-width";
