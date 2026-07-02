"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ProfileSheetContextValue = {
  open: boolean;
  openProfileSheet: () => void;
  closeProfileSheet: () => void;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | null>(null);

export function ProfileSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openProfileSheet = useCallback(() => setOpen(true), []);
  const closeProfileSheet = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openProfileSheet, closeProfileSheet }),
    [open, openProfileSheet, closeProfileSheet],
  );
  return <ProfileSheetContext.Provider value={value}>{children}</ProfileSheetContext.Provider>;
}

export function useProfileSheet(): ProfileSheetContextValue {
  const ctx = useContext(ProfileSheetContext);
  if (!ctx) {
    throw new Error("useProfileSheet must be used within ProfileSheetProvider");
  }
  return ctx;
}

/** Safe optional hook for components outside provider. */
export function useProfileSheetOptional(): ProfileSheetContextValue | null {
  return useContext(ProfileSheetContext);
}
