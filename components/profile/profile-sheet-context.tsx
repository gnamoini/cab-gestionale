"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ProfileSheet } from "@/components/profile/profile-sheet";

type ProfileSheetContextValue = {
  open: boolean;
  openProfileSheet: () => void;
  closeProfileSheet: () => void;
  restoreFocusRef: RefObject<HTMLElement | null>;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | null>(null);

export function ProfileSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openProfileSheet = useCallback(() => setOpen(true), []);
  const closeProfileSheet = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openProfileSheet, closeProfileSheet, restoreFocusRef }),
    [open, openProfileSheet, closeProfileSheet],
  );

  return (
    <ProfileSheetContext.Provider value={value}>
      {children}
      <ProfileSheet restoreFocusRef={restoreFocusRef} />
    </ProfileSheetContext.Provider>
  );
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
