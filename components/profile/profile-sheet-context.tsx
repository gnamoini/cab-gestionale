"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";

const ProfileSheetLazy = dynamic(
  () => import("@/components/profile/profile-sheet").then((m) => ({ default: m.ProfileSheet })),
  { ssr: false },
);

type ProfileSheetContextValue = {
  openProfileSheet: () => void;
  closeProfileSheet: () => void;
  toggleProfileSheet: (restoreFocus?: HTMLElement | null) => void;
  restoreFocusRef: RefObject<HTMLElement | null>;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | null>(null);

type ProfileSheetOpenStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => boolean;
};

const ProfileSheetOpenStoreContext = createContext<ProfileSheetOpenStore | null>(null);

export function ProfileSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sheetEverOpened, setSheetEverOpened] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const openListenersRef = useRef(new Set<() => void>());

  const setOpenState = useCallback((next: boolean) => {
    if (openRef.current === next) return;
    openRef.current = next;
    setOpen(next);
    openListenersRef.current.forEach((listener) => listener());
  }, []);

  const openStore = useMemo<ProfileSheetOpenStore>(
    () => ({
      getSnapshot: () => openRef.current,
      subscribe: (onStoreChange) => {
        openListenersRef.current.add(onStoreChange);
        return () => {
          openListenersRef.current.delete(onStoreChange);
        };
      },
    }),
    [],
  );

  const openProfileSheet = useCallback(() => {
    setSheetEverOpened(true);
    setOpenState(true);
  }, [setOpenState]);

  const closeProfileSheet = useCallback(() => {
    setOpenState(false);
  }, [setOpenState]);

  const toggleProfileSheet = useCallback(
    (restoreFocus?: HTMLElement | null) => {
      if (openRef.current) {
        closeProfileSheet();
        return;
      }
      if (restoreFocus) restoreFocusRef.current = restoreFocus;
      openProfileSheet();
    },
    [closeProfileSheet, openProfileSheet],
  );

  const value = useMemo(
    () => ({ openProfileSheet, closeProfileSheet, toggleProfileSheet, restoreFocusRef }),
    [openProfileSheet, closeProfileSheet, toggleProfileSheet],
  );

  return (
    <ProfileSheetOpenStoreContext.Provider value={openStore}>
      <ProfileSheetContext.Provider value={value}>
        {children}
        {sheetEverOpened ? (
          <ProfileSheetLazy open={open} onClose={closeProfileSheet} restoreFocusRef={restoreFocusRef} />
        ) : null}
      </ProfileSheetContext.Provider>
    </ProfileSheetOpenStoreContext.Provider>
  );
}

/** UI chrome (chevron/aria) — non nel context value principale. */
export function useProfileSheetOpen(): boolean {
  const store = useContext(ProfileSheetOpenStoreContext);
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    () => store?.getSnapshot() ?? false,
    () => false,
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
