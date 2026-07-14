"use client";

import { useCallback, useState } from "react";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const BANNER_SHELL =
  "sticky top-0 z-[89] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm";

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
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-xs text-[color:var(--cab-text)]">
          <p className="font-semibold">Installa App</p>
          <p className="mt-0.5 text-[color:var(--cab-text-muted)]">
            Per usare il gestionale come applicazione sul dispositivo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <button
            type="button"
            disabled={!canPrompt || installing}
            className="rounded-lg bg-[color:var(--cab-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            onClick={() => void handleInstall()}
          >
            {installing ? "Installazione…" : "Installa App"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[color:var(--cab-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cab-text)] hover:bg-[color:var(--cab-surface-2)]"
            onClick={handleDismiss}
          >
            Non ora
          </button>
        </div>
      </div>
    </div>
  );
}
