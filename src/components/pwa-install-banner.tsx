"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";
import { dsSystemBannerGhostBtn, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const INSTALL_BENEFITS = ["Accesso rapido", "Schermo intero", "Icona sul dispositivo"] as const;

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
        media={
          <Image
            src={`${PWA_ICON_BASE_PATH}/icon-96x96.png`}
            alt=""
            width={44}
            height={44}
            className="rounded-[var(--ds-radius-lg)] ring-1 ring-[color:color-mix(in_srgb,#ffffff_12%,transparent)]"
          />
        }
        title={`Installa ${CAB_APP_PRODUCT_NAME}`}
        description="Apri il gestionale come app dedicata, senza barra del browser."
        tags={INSTALL_BENEFITS}
        tagsAriaLabel="Vantaggi installazione"
        onDismiss={handleDismiss}
        dismissLabel="Chiudi suggerimento installazione"
        actions={
          <>
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
            <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
              Non ora
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}
