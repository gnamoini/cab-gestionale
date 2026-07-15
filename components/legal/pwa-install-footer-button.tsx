"use client";

import { useCallback, useState } from "react";
import { profileFooterActionClass } from "@/components/legal/privacy-policy-link";
import { dsFocus } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const installButtonClass = `${profileFooterActionClass} ${dsFocus}`;

export function PwaInstallFooterButton({ className = "" }: { className?: string }) {
  const { canPrompt, promptInstall, platform, isAppInstalled } = usePwaInstallPrompt();
  const toast = useGestionaleToast();
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    if (isAppInstalled) return;
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
  }, [canPrompt, isAppInstalled, platform, promptInstall, toast]);

  return (
    <button
      type="button"
      className={`${installButtonClass} ${className}`.trim()}
      disabled={isAppInstalled || installing}
      title={isAppInstalled ? "App già installata" : undefined}
      aria-label={isAppInstalled ? "App già installata" : "Installa app"}
      onClick={() => void handleInstall()}
    >
      {installing ? "Installazione…" : "Installa app"}
    </button>
  );
}
