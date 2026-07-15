"use client";

import { memo, useSyncExternalStore } from "react";
import { SystemBannerShell } from "@/components/design-system/system-banner";
import {
  PWA_OFFLINE_WRITE_MESSAGE,
  readPwaConnectivityState,
  subscribePwaConnectivity,
} from "@/lib/pwa/pwa-connectivity";
import { dsSystemBannerTitle } from "@/lib/ui/design-system";

export const PwaOfflineBlockBanner = memo(function PwaOfflineBlockBanner() {
  const online = useSyncExternalStore(
    subscribePwaConnectivity,
    () => readPwaConnectivityState().online,
    () => true,
  );

  if (online) return null;

  return (
    <SystemBannerShell ariaLabel="Connessione assente" role="status">
      <p className={`text-center ${dsSystemBannerTitle}`}>{PWA_OFFLINE_WRITE_MESSAGE}</p>
    </SystemBannerShell>
  );
});
