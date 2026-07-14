"use client";

import { memo } from "react";
import { useSyncExternalStore } from "react";
import {
  PWA_OFFLINE_WRITE_MESSAGE,
  readPwaConnectivityState,
  subscribePwaConnectivity,
} from "@/lib/pwa/pwa-connectivity";

const BANNER_SHELL =
  "sticky top-0 z-[86] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] px-4 py-2.5 shadow-sm";

export const PwaOfflineBlockBanner = memo(function PwaOfflineBlockBanner() {
  const online = useSyncExternalStore(
    subscribePwaConnectivity,
    () => readPwaConnectivityState().online,
    () => true,
  );

  if (online) return null;

  return (
    <div role="status" aria-live="polite" className={BANNER_SHELL}>
      <p className="mx-auto max-w-4xl text-center text-xs font-medium text-[color:var(--cab-text)]">
        {PWA_OFFLINE_WRITE_MESSAGE}
      </p>
    </div>
  );
});
