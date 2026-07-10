"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";

type MobileNavShellContextValue = {
  openMobileNav: () => void;
  registerMobileNavTrigger: (el: HTMLElement | null) => void;
  getMobileNavTrigger: () => HTMLElement | null;
};

const MobileNavShellContext = createContext<MobileNavShellContextValue | null>(null);

export function MobileNavShellProvider({
  openMobileNav,
  children,
}: {
  openMobileNav: () => void;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);

  const registerMobileNavTrigger = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
  }, []);

  const getMobileNavTrigger = useCallback(() => triggerRef.current, []);

  return (
    <MobileNavShellContext.Provider
      value={{ openMobileNav, registerMobileNavTrigger, getMobileNavTrigger }}
    >
      {children}
    </MobileNavShellContext.Provider>
  );
}

export function useMobileNavShell(): MobileNavShellContextValue | null {
  return useContext(MobileNavShellContext);
}
