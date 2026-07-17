"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

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

  const value = useMemo(
    () => ({ openMobileNav, registerMobileNavTrigger, getMobileNavTrigger }),
    [openMobileNav, registerMobileNavTrigger, getMobileNavTrigger],
  );

  return (
    <MobileNavShellContext.Provider value={value}>
      {children}
    </MobileNavShellContext.Provider>
  );
}

export function useMobileNavShell(): MobileNavShellContextValue | null {
  return useContext(MobileNavShellContext);
}
