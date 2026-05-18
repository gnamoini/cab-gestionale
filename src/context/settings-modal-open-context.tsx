"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SettingsModalOpenContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const SettingsModalOpenContext = createContext<SettingsModalOpenContextValue | null>(null);

export function SettingsModalOpenProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setOpen }), [isOpen]);
  return <SettingsModalOpenContext.Provider value={value}>{children}</SettingsModalOpenContext.Provider>;
}

export function useSettingsModalOpen(): SettingsModalOpenContextValue {
  const ctx = useContext(SettingsModalOpenContext);
  if (!ctx) {
    return { isOpen: false, setOpen: () => {} };
  }
  return ctx;
}
