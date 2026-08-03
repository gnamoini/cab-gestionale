"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  getGestionaleDirtySnapshot,
  getGestionaleSyncStoreRevision,
  subscribeGestionaleDirtyAndScopes,
  type DirtyEntry,
} from "@/lib/sync/gestionale-dirty-state";
import { getActiveSyncContexts } from "@/lib/sync/gestionale-sync-scope";
import { getVisibleDirtyEntries } from "@/lib/sync/gestionale-visible-dirty";

type GestionaleDirtyContextValue = {
  dirtyEntries: DirtyEntry[];
  hasDirty: boolean;
};

const GestionaleDirtyContext = createContext<GestionaleDirtyContextValue | null>(null);

function readVisibleDirtySnapshot(pathname: string): DirtyEntry[] {
  const snapshot = getGestionaleDirtySnapshot();
  return getVisibleDirtyEntries({
    pathname,
    scopes: getActiveSyncContexts(),
    dirtyEntries: [...snapshot.entries.values()],
  });
}

export function GestionaleDirtyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  const storeRevision = useSyncExternalStore(
    subscribeGestionaleDirtyAndScopes,
    getGestionaleSyncStoreRevision,
    () => "0|0",
  );

  const dirtyEntries = useMemo(() => {
    void storeRevision;
    return readVisibleDirtySnapshot(pathname);
  }, [pathname, storeRevision]);

  const hasDirty = dirtyEntries.length > 0;

  const value = useMemo(
    (): GestionaleDirtyContextValue => ({ dirtyEntries, hasDirty }),
    [dirtyEntries, hasDirty],
  );

  return (
    <GestionaleDirtyContext.Provider value={value}>{children}</GestionaleDirtyContext.Provider>
  );
}

export function useGestionaleDirty(): GestionaleDirtyContextValue {
  const ctx = useContext(GestionaleDirtyContext);
  if (!ctx) {
    throw new Error("useGestionaleDirty must be used within GestionaleDirtyProvider");
  }
  return ctx;
}
