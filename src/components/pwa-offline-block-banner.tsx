"use client";

import { memo, useSyncExternalStore } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { SystemBannerOfflineIcon } from "@/components/design-system/system-banner-offline-icon";
import {
  PWA_OFFLINE_BANNER_ARIA_LABEL,
  PWA_OFFLINE_BANNER_DESCRIPTION,
  PWA_OFFLINE_BANNER_TITLE,
} from "@/lib/pwa/pwa-offline-banner-copy";
import {
  readPwaConnectivityState,
  subscribePwaConnectivity,
} from "@/lib/pwa/pwa-connectivity";

export const PwaOfflineBlockBanner = memo(function PwaOfflineBlockBanner() {
  const online = useSyncExternalStore(
    subscribePwaConnectivity,
    () => readPwaConnectivityState().online,
    () => true,
  );

  if (online) return null;

  return (
    <SystemBannerShell ariaLabel={PWA_OFFLINE_BANNER_ARIA_LABEL} role="status">
      <SystemBannerLayout
        media={<SystemBannerOfflineIcon />}
        title={PWA_OFFLINE_BANNER_TITLE}
        description={PWA_OFFLINE_BANNER_DESCRIPTION}
      />
    </SystemBannerShell>
  );
});
