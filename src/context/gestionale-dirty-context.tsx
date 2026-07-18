"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDirtyForActiveScopesSnapshot,
  subscribeGestionaleDirty,
  type DirtyEntry,
} from "@/lib/sync/gestionale-dirty-state";
import { flushGestionaleDirty } from "@/lib/sync/gestionale-dirty-flush";
import { getActiveSyncContexts } from "@/lib/sync/gestionale-sync-scope";

type GestionaleDirtyContextValue = {
  dirtyEntries: DirtyEntry[];
  hasDirty: boolean;
  flush: (reason?: "user_requested" | "navigation") => Promise<void>;
};

const GestionaleDirtyContext = createContext<GestionaleDirtyContextValue | null>(null);

const EMPTY_DIRTY_SNAPSHOT: DirtyEntry[] = [];

function readDirtySnapshot(): DirtyEntry[] {
  return getDirtyForActiveScopesSnapshot(getActiveSyncContexts());
}

export function GestionaleDirtyProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const dirtyEntries = useSyncExternalStore(
    subscribeGestionaleDirty,
    readDirtySnapshot,
    () => EMPTY_DIRTY_SNAPSHOT,
  );

  const hasDirty = dirtyEntries.length > 0;

  const flush = useCallback(
    async (reason: "user_requested" | "navigation" = "user_requested") => {
      const domains = [...new Set(dirtyEntries.map((e) => e.domain))];
      await flushGestionaleDirty(qc, {
        reason,
        domains: domains.length > 0 ? domains : undefined,
      });
    },
    [qc, dirtyEntries],
  );

  const value = useMemo(
    (): GestionaleDirtyContextValue => ({ dirtyEntries, hasDirty, flush }),
    [dirtyEntries, hasDirty, flush],
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
