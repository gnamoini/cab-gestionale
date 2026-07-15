"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { NotificationBellIcon } from "@/components/design-system";
import {
  NOTIFICATION_OPT_IN_BENEFITS,
  notificationOptInContextLabel,
  notificationOptInDeniedMessage,
  notificationOptInDescription,
  notificationOptInSuccessMessage,
  type NotificationOptInMode,
} from "@/lib/notifications/notification-opt-in-copy";
import {
  dismissDesktopNotificationPrompt,
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  shouldShowDesktopNotificationPermissionBanner,
  wasDesktopNotificationPromptDismissed,
} from "@/lib/lavorazioni/desktop-notifications";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";
import { isMobileHandheldPlatform } from "@/lib/pwa/pwa-mobile";
import { dsBtnGhost, dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";

const BANNER_SHELL =
  "sticky top-0 z-[90] border-b border-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cab-primary)_11%,var(--cab-surface)),var(--cab-surface))] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[var(--cab-shadow-sm)] sm:px-4";

function BannerDismissIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

function NotificationOptInBannerBody({
  mode,
  busy,
  onEnable,
  onDismiss,
}: {
  mode: NotificationOptInMode;
  busy?: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="region" aria-label="Attiva notifiche gestionale" className={BANNER_SHELL}>
      <div className="relative mx-auto max-w-4xl rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-card)_88%,var(--cab-surface))] p-3 shadow-[var(--cab-shadow-sm)] sm:p-3.5">
        <button
          type="button"
          aria-label="Chiudi suggerimento notifiche"
          className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[var(--ds-radius-lg)] text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] ${dsFocus}`}
          onClick={onDismiss}
        >
          <BannerDismissIcon />
        </button>

        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:gap-4 sm:pr-10">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))]"
              aria-hidden
            >
              <NotificationBellIcon />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">Attiva le notifiche</p>
                <span className="rounded-full border border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_78%,var(--cab-text))]">
                  {notificationOptInContextLabel(mode)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                {notificationOptInDescription(mode)}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tipi di avviso">
                {NOTIFICATION_OPT_IN_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="rounded-full border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--cab-text-muted)]"
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
              disabled={busy}
              className={`${dsBtnPrimary} w-full text-xs py-2 px-4 sm:w-auto sm:min-w-[9.5rem]`}
              onClick={onEnable}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" label="Attivazione notifiche" className="mt-0" />
                  Attivazione…
                </span>
              ) : (
                "Attiva notifiche"
              )}
            </button>
            <button type="button" className={`${dsBtnGhost} w-full py-1.5 text-xs sm:w-auto`} onClick={onDismiss}>
              Non ora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationOptInBanner() {
  const rbac = useRbac();
  const gestToast = useGestionaleToast();
  const push = usePwaPushOptIn();
  const preferPush = shouldPreferPwaPushOverDesktopPrompt();
  const enabled = rbac.canReadPage("dashboard") && !rbac.isLoading;

  const [permissionState, setPermissionState] = useState(() => getDesktopNotificationPermissionState());
  const [dismissed, setDismissed] = useState(() => wasDesktopNotificationPromptDismissed());
  const [hidden, setHidden] = useState(false);

  const syncDesktopState = useCallback(() => {
    setPermissionState(getDesktopNotificationPermissionState());
    setDismissed(wasDesktopNotificationPromptDismissed());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    syncDesktopState();
  }, [enabled, syncDesktopState]);

  const desktopVisible =
    enabled &&
    !hidden &&
    !preferPush &&
    !isMobileHandheldPlatform() &&
    shouldShowDesktopNotificationPermissionBanner(permissionState, dismissed);

  const pushVisible = enabled && !hidden && preferPush && push.visible;

  const handleDismissDesktop = useCallback(() => {
    dismissDesktopNotificationPrompt();
    setDismissed(true);
    setHidden(true);
  }, []);

  const handleEnableDesktop = useCallback(async () => {
    const result = await requestDesktopNotificationPermissionInteractive();
    syncDesktopState();
    if (result === "granted") {
      setHidden(true);
      gestToast.success(notificationOptInSuccessMessage());
      return;
    }
    if (result === "denied") {
      setHidden(true);
      gestToast.validation(notificationOptInDeniedMessage("browser"));
    }
  }, [gestToast, syncDesktopState]);

  const handleDismissPush = useCallback(() => {
    push.dismissPushOptIn();
    setHidden(true);
  }, [push]);

  const handleEnablePush = useCallback(async () => {
    const result = await push.enablePush();
    if (result === "granted") {
      setHidden(true);
      gestToast.success(notificationOptInSuccessMessage());
      return;
    }
    if (result === "denied") {
      setHidden(true);
      gestToast.validation(notificationOptInDeniedMessage("push"));
    }
    if (result === "error") {
      gestToast.error("Impossibile attivare le notifiche. Riprova tra poco.");
    }
  }, [gestToast, push]);

  if (pushVisible) {
    return (
      <NotificationOptInBannerBody
        mode="push"
        busy={push.busy}
        onEnable={() => void handleEnablePush()}
        onDismiss={handleDismissPush}
      />
    );
  }

  if (desktopVisible) {
    return (
      <NotificationOptInBannerBody
        mode="browser"
        onEnable={() => void handleEnableDesktop()}
        onDismiss={handleDismissDesktop}
      />
    );
  }

  return null;
}
