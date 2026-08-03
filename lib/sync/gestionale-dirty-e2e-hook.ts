/**
 * E2E/dev hook — espone markGestionaleDirty su window per test Playwright.
 * ponytail: no persistenza; solo in-memory mark per simulare realtime.
 */
import { markGestionaleDirty, type DirtyEntry } from "@/lib/sync/gestionale-dirty-state";

type CabE2eDirtyHook = {
  markDirty: (entry: Omit<DirtyEntry, "timestamp"> & { timestamp?: number }) => void;
};

declare global {
  interface Window {
    __CAB_E2E_DIRTY__?: CabE2eDirtyHook;
  }
}

export function installGestionaleDirtyE2eHook(): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;

  window.__CAB_E2E_DIRTY__ = {
    markDirty(entry) {
      markGestionaleDirty({
        ...entry,
        timestamp: entry.timestamp ?? Date.now(),
      });
    },
  };
}
