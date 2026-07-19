"use client";

import { useCallback, useState } from "react";
import { profileFooterActionClass } from "@/components/legal/privacy-policy-link";
import { dsFocus } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaInstallPrompt } from "@/src/hooks/use-pwa-install-prompt";

const installButtonClass = `${profileFooterActionClass} ${dsFocus}`;

const profileActionItemClass =
  "group flex w-full min-h-11 items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[color:var(--cab-text)] transition-colors duration-150 hover:bg-[var(--cab-hover)] active:bg-[color:color-mix(in_srgb,var(--cab-hover)_92%,var(--cab-card))] sm:min-h-10";

export function usePwaInstallFooterAction() {
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

  const disabled = isAppInstalled || installing;
  const label = installing ? "Installazione…" : "Installa app";

  return {
    handleInstall,
    disabled,
    label,
    isAppInstalled,
    installing,
    title: isAppInstalled ? "App già installata" : undefined,
    ariaLabel: isAppInstalled ? "App già installata" : "Installa app",
  };
}

export function PwaInstallFooterButton({
  className = "",
  variant = "footer",
}: {
  className?: string;
  variant?: "footer" | "profile-action";
}) {
  const { handleInstall, disabled, label, title, ariaLabel } = usePwaInstallFooterAction();

  if (variant === "profile-action") {
    return (
      // ui-contract-disable-next-line native-title-tooltip: PWA install action mirrors aria-label on profile row
      <button
        type="button"
        className={`${profileActionItemClass} ${dsFocus} disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed ${className}`.trim()}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onClick={() => void handleInstall()}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] text-[color:var(--cab-text-muted)] transition-colors duration-150 group-hover:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-hover))] group-hover:text-[color:var(--cab-text)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </button>
    );
  }

  return (
    // ui-contract-disable-next-line native-title-tooltip: PWA footer install button mirrors aria-label
    <button
      type="button"
      className={`${installButtonClass} ${className}`.trim()}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onClick={() => void handleInstall()}
    >
      {label}
    </button>
  );
}
