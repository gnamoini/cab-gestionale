"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";
import { dsBtnGhost, dsFocus } from "@/lib/ui/design-system";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const HINT_SHELL =
  "sticky top-0 z-[89] border-b border-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cab-primary)_11%,var(--cab-surface)),var(--cab-surface))] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[var(--cab-shadow-sm)] sm:px-4";

const IOS_STEPS = [
  { step: "1", label: "Tocca", emphasis: "Condividi" },
  { step: "2", label: "Seleziona", emphasis: "Aggiungi a Home" },
] as const;

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

export function PwaIosInstallHint() {
  const { variant, dismissInstall } = usePwaInstallPrompt();
  const [hidden, setHidden] = useState(false);

  const handleDismiss = useCallback(() => {
    dismissInstall();
    setHidden(true);
  }, [dismissInstall]);

  if (variant !== "ios-hint" || hidden) return null;

  return (
    <div role="region" aria-label="Aggiungi alla schermata Home" className={HINT_SHELL}>
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
                Aggiungi {CAB_APP_PRODUCT_NAME}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                Su iPhone e iPad l&apos;app si installa dalla barra di Safari.
              </p>
              <ol className="mt-2 space-y-1.5" aria-label="Passaggi installazione iOS">
                {IOS_STEPS.map((item) => (
                  <li key={item.step} className="flex items-center gap-2 text-xs text-[color:var(--cab-text-muted)]">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[10px] font-bold text-[color:color-mix(in_srgb,var(--cab-primary)_82%,var(--cab-text))]">
                      {item.step}
                    </span>
                    <span>
                      {item.label}{" "}
                      <span className="font-semibold text-[color:var(--cab-text)]">{item.emphasis}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex shrink-0 sm:items-end">
            <button
              type="button"
              className={`${dsBtnGhost} w-full py-1.5 text-xs sm:w-auto sm:min-w-[7.5rem]`}
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
