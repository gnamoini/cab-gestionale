"use client";

import { useCallback, useEffect, useState } from "react";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  dismissDesktopNotificationPrompt,
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  shouldShowDesktopNotificationPermissionBanner,
  wasDesktopNotificationPromptDismissed,
} from "@/lib/lavorazioni/desktop-notifications";

export function DesktopNotificationPermissionPrompt() {
  const rbac = useRbac();
  const gestToast = useGestionaleToast();
  const enabled = rbac.canReadPage("dashboard") && !rbac.isLoading;
  const [permissionState, setPermissionState] = useState(() => getDesktopNotificationPermissionState());
  const [dismissed, setDismissed] = useState(() => wasDesktopNotificationPromptDismissed());
  const [hidden, setHidden] = useState(false);

  const syncState = useCallback(() => {
    setPermissionState(getDesktopNotificationPermissionState());
    setDismissed(wasDesktopNotificationPromptDismissed());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    syncState();
  }, [enabled, syncState]);

  const visible =
    enabled &&
    !hidden &&
    shouldShowDesktopNotificationPermissionBanner(permissionState, dismissed);

  const handleEnable = useCallback(async () => {
    const result = await requestDesktopNotificationPermissionInteractive();
    syncState();
    if (result === "granted") {
      setHidden(true);
      gestToast.success("Notifiche desktop attivate.");
      return;
    }
    if (result === "denied") {
      setHidden(true);
      gestToast.validation(
        "Notifiche desktop bloccate. Consenti le notifiche per questo sito dalle impostazioni del browser (icona lucchetto nella barra degli indirizzi).",
      );
    }
  }, [gestToast, syncState]);

  const handleDismiss = useCallback(() => {
    dismissDesktopNotificationPrompt();
    setDismissed(true);
    setHidden(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Abilita notifiche desktop"
      className="sticky top-0 z-[90] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-2.5 shadow-sm"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-xs text-[color:var(--cab-text)]">
          <p className="font-semibold">Notifiche desktop</p>
          <p className="mt-0.5 text-[color:var(--cab-text-muted)]">
            Ricevi avvisi del sistema per nuove lavorazioni, sotto scorta, presenze e promemoria anche con il
            gestionale in secondo piano.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-[color:var(--cab-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            onClick={() => void handleEnable()}
          >
            Abilita notifiche
          </button>
          <button
            type="button"
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]"
            onClick={handleDismiss}
          >
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}
