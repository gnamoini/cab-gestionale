"use client";

import { useSyncExternalStore } from "react";

/** True dopo l'hydration client — false su SSR e al primo render client (snapshot server). */
export function useClientHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
