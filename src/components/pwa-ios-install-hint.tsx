"use client";

import { useCallback, useState } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { dsSystemBannerGhostBtn } from "@/lib/ui/design-system";
import { PwaBannerAppIcon } from "@/src/components/pwa-banner-app-icon";
import { PwaIosInstallSteps } from "@/src/components/pwa-ios-install-steps";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

export function PwaIosInstallHint() {
  const { variant, dismissInstall } = usePwaInstallPrompt();
  const [hidden, setHidden] = useState(false);

  const handleDismiss = useCallback(() => {
    dismissInstall();
    setHidden(true);
  }, [dismissInstall]);

  if (variant !== "ios-hint" || hidden) return null;

  return (
    <SystemBannerShell ariaLabel="Aggiungi alla schermata Home">
      <SystemBannerLayout
        media={<PwaBannerAppIcon />}
        title={`Aggiungi l'app ${CAB_APP_PRODUCT_NAME}`}
        description="Su iPhone e iPad l'app si installa dalla barra di Safari."
        onDismiss={handleDismiss}
        dismissLabel="Chiudi suggerimento installazione"
        actions={
          <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
            Non ora
          </button>
        }
      >
        <PwaIosInstallSteps />
      </SystemBannerLayout>
    </SystemBannerShell>
  );
}
