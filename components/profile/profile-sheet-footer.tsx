"use client";

import { useCallback, useState } from "react";
import { PrivacyPolicyLink, profileFooterActionClass } from "@/components/legal/privacy-policy-link";
import { dsFocus } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const installButtonClass = `${profileFooterActionClass} ${dsFocus}`;

export function ProfileSheetFooter() {
  const { menuInstallAvailable, canPrompt, promptInstall, platform } = usePwaInstallPrompt();
  const toast = useGestionaleToast();
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      toast.info("Su iOS: tocca Condividi, poi «Aggiungi a Home».");
      return;
    }
    if (!canPrompt) {
      toast.info("Installazione non disponibile su questo browser. Prova Chrome o Edge.");
      return;
    }
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      toast.success("App installata.");
    }
  }, [canPrompt, platform, promptInstall, toast]);

  return (
    <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
      {menuInstallAvailable ? (
        <>
          <button
            type="button"
            className={installButtonClass}
            disabled={installing}
            onClick={() => void handleInstall()}
          >
            {installing ? "Installazione…" : "Installa app"}
          </button>
          <span className={`${profileFooterActionClass} min-h-0 px-0 py-0`} aria-hidden>
            ·
          </span>
        </>
      ) : null}
      <PrivacyPolicyLink />
    </div>
  );
}
