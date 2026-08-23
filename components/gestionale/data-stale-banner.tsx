"use client";

import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { SystemBannerRefreshIcon } from "@/components/design-system/system-banner-refresh-icon";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import {
  GESTIONALE_DATA_STALE_BANNER_ACTION_LABEL,
  GESTIONALE_DATA_STALE_BANNER_ARIA_LABEL,
  GESTIONALE_DATA_STALE_BANNER_DESCRIPTION,
  GESTIONALE_DATA_STALE_BANNER_TITLE,
} from "@/lib/sync/gestionale-dirty-banner-copy";
import { useGestionaleDirty } from "@/src/context/gestionale-dirty-context";
import { dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";

export function DataStaleBanner() {
  const { hasDirty } = useGestionaleDirty();

  if (!isGestionaleDirtySyncEnabled() || !hasDirty) {
    return null;
  }

  return (
    <SystemBannerShell ariaLabel={GESTIONALE_DATA_STALE_BANNER_ARIA_LABEL} role="status" placement="inShell">
      <SystemBannerLayout
        media={<SystemBannerRefreshIcon />}
        title={GESTIONALE_DATA_STALE_BANNER_TITLE}
        description={GESTIONALE_DATA_STALE_BANNER_DESCRIPTION}
        actions={
          <button
            type="button"
            className={dsSystemBannerPrimaryBtn}
            onClick={() => window.location.reload()}
          >
            {GESTIONALE_DATA_STALE_BANNER_ACTION_LABEL}
          </button>
        }
      />
    </SystemBannerShell>
  );
}
