"use client";

import { useSyncExternalStore } from "react";
import {
  isPwaStandaloneMode,
  PWA_DISPLAY_MODE_FULLSCREEN_QUERY,
  PWA_DISPLAY_MODE_MINIMAL_UI_QUERY,
  PWA_DISPLAY_MODE_STANDALONE_QUERY,
  resolvePwaDisplayMode,
  type PwaDisplayMode,
} from "@/lib/pwa/pwa-display-mode";

function readDisplayMode(): PwaDisplayMode {
  if (typeof window === "undefined") return "browser";
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return resolvePwaDisplayMode({
    matchMedia: (q) => window.matchMedia(q),
    navigatorStandalone: nav.standalone === true,
  });
}

export function subscribePwaDisplayMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const queries = [
    PWA_DISPLAY_MODE_STANDALONE_QUERY,
    PWA_DISPLAY_MODE_FULLSCREEN_QUERY,
    PWA_DISPLAY_MODE_MINIMAL_UI_QUERY,
  ];
  const mqls = queries.map((q) => window.matchMedia(q));
  const onChange = () => onStoreChange();
  for (const mql of mqls) {
    mql.addEventListener("change", onChange);
  }
  window.addEventListener("visibilitychange", onChange);
  return () => {
    for (const mql of mqls) {
      mql.removeEventListener("change", onChange);
    }
    window.removeEventListener("visibilitychange", onChange);
  };
}

export function getPwaDisplayModeSnapshot(): PwaDisplayMode {
  return readDisplayMode();
}

export function usePwaDisplayMode() {
  const displayMode = useSyncExternalStore(
    subscribePwaDisplayMode,
    getPwaDisplayModeSnapshot,
    () => "browser" as const,
  );

  return {
    displayMode,
    isStandalone: isPwaStandaloneMode(displayMode),
  };
}
