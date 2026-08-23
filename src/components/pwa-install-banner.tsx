"use client";

import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { dsSystemBannerGhostBtn, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { PwaBannerAppIcon } from "@/src/components/pwa-banner-app-icon";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

export function PwaInstallBanner() {
  const { variant, canPrompt, promptInstall, dismissInstall } = usePwaInstallPrompt();
  const [hidden, setHidden] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    if (!canPrompt) return;
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted" || outcome === "dismissed") {
      setHidden(true);
    }
  }, [canPrompt, promptInstall]);

  const handleDismiss = useCallback(() => {
    dismissInstall();
    setHidden(true);
  }, [dismissInstall]);

  if (variant !== "native" || hidden) return null;

  return (
    <SystemBannerShell ariaLabel="Installa applicazione">
      <SystemBannerLayout
        media={<PwaBannerAppIcon />}
        title={`Installa l'app ${CAB_APP_PRODUCT_NAME}`}
        description="Apri il gestionale come app dedicata, senza barra del browser."
        onDismiss={handleDismiss}
        dismissLabel="Chiudi suggerimento installazione"
        actions={
          <>
            <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
              Non ora
            </button>
            <button
              type="button"
              disabled={!canPrompt || installing}
              className={dsSystemBannerPrimaryBtn}
              onClick={() => void handleInstall()}
            >
              {installing ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" label="Installazione in corso" className="mt-0" />
                  Installazione…
                </span>
              ) : (
                "Installa app"
              )}
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}
