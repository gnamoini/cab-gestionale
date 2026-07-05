"use client";

import { createContext, useContext, type ReactNode } from "react";

type MobileNavShellContextValue = {
  openMobileNav: () => void;
};

const MobileNavShellContext = createContext<MobileNavShellContextValue | null>(null);

export function MobileNavShellProvider({
  openMobileNav,
  children,
}: {
  openMobileNav: () => void;
  children: ReactNode;
}) {
  return (
    <MobileNavShellContext.Provider value={{ openMobileNav }}>{children}</MobileNavShellContext.Provider>
  );
}

export function useMobileNavShell(): MobileNavShellContextValue | null {
  return useContext(MobileNavShellContext);
}
