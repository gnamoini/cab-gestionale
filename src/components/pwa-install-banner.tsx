"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";
import { dsBtnGhost, dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const BANNER_SHELL =
  "sticky top-0 z-[89] border-b border-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cab-primary)_11%,var(--cab-surface)),var(--cab-surface))] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[var(--cab-shadow-sm)] sm:px-4";

const INSTALL_BENEFITS = ["Accesso rapido", "Schermo intero", "Icona sul dispositivo"] as const;

function PwaInstallDismissIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

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
    <div role="region" aria-label="Installa applicazione" className={BANNER_SHELL}>
      <div className="relative mx-auto max-w-4xl rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-card)_88%,var(--cab-surface))] p-3 shadow-[var(--cab-shadow-sm)] sm:p-3.5">
        <button
          type="button"
          aria-label="Chiudi suggerimento installazione"
          className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[var(--ds-radius-lg)] text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] ${dsFocus}`}
          onClick={handleDismiss}
        >
          <PwaInstallDismissIcon />
        </button>

        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:gap-4 sm:pr-10">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
            <div className="relative shrink-0">
              <Image
                src={`${PWA_ICON_BASE_PATH}/icon-96x96.png`}
                alt=""
                width={48}
                height={48}
                className="rounded-[var(--ds-radius-lg)] shadow-[var(--cab-shadow-md)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_85%,transparent)]"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
                Installa {CAB_APP_PRODUCT_NAME}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                Apri il gestionale come app dedicata, senza barra del browser.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Vantaggi installazione">
                {INSTALL_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="rounded-full border border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_78%,var(--cab-text))]"
                  >
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <button
              type="button"
              disabled={!canPrompt || installing}
              className={`${dsBtnPrimary} w-full text-xs py-2 px-4 sm:w-auto sm:min-w-[9.5rem]`}
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
            <button
              type="button"
              className={`${dsBtnGhost} w-full py-1.5 text-xs sm:w-auto`}
              onClick={handleDismiss}
            >
              Non ora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
