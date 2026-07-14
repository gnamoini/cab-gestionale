"use client";

import { useCallback, useState } from "react";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const HINT_SHELL =
  "sticky top-0 z-[89] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm";

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
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-xs text-[color:var(--cab-text)]">
          <p className="font-semibold">Aggiungi alla schermata Home</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[color:var(--cab-text-muted)]">
            <li>Tocca <span className="font-semibold text-[color:var(--cab-text)]">Condividi</span></li>
            <li>Seleziona <span className="font-semibold text-[color:var(--cab-text)]">Aggiungi a Home</span></li>
          </ol>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
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
