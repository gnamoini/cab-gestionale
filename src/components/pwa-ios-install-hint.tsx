"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";
import { dsSystemBannerGhostBtn } from "@/lib/ui/design-system";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const IOS_STEPS = [
  { step: "1", label: "Tocca", emphasis: "Condividi" },
  { step: "2", label: "Seleziona", emphasis: "Aggiungi a Home" },
] as const;

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
        media={
          <Image
            src={`${PWA_ICON_BASE_PATH}/icon-96x96.png`}
            alt=""
            width={44}
            height={44}
            className="rounded-[var(--ds-radius-lg)] ring-1 ring-[color:color-mix(in_srgb,#ffffff_12%,transparent)]"
          />
        }
        title={`Aggiungi ${CAB_APP_PRODUCT_NAME}`}
        description="Su iPhone e iPad l'app si installa dalla barra di Safari."
        onDismiss={handleDismiss}
        dismissLabel="Chiudi suggerimento installazione"
        actions={
          <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
            Non ora
          </button>
        }
      >
        <ol className="mt-2 space-y-1.5" aria-label="Passaggi installazione iOS">
          {IOS_STEPS.map((item) => (
            <li key={item.step} className="flex items-center gap-2 text-xs text-[color:#a1a1aa]">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,#ffffff_10%,transparent)] text-[10px] font-bold text-[color:#fafafa]">
                {item.step}
              </span>
              <span>
                {item.label}{" "}
                <span className="font-semibold text-[color:#fafafa]">{item.emphasis}</span>
              </span>
            </li>
          ))}
        </ol>
      </SystemBannerLayout>
    </SystemBannerShell>
  );
}
