"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { NotificationBellIcon } from "@/components/design-system";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
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
import { dsSystemBannerContextChip, dsSystemBannerGhostBtn, dsSystemBannerIconWrap, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";

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
    <SystemBannerShell ariaLabel="Attiva notifiche gestionale">
      <SystemBannerLayout
        media={
          <div className={dsSystemBannerIconWrap} aria-hidden>
            <NotificationBellIcon />
          </div>
        }
        title="Attiva le notifiche"
        titleExtra={<span className={dsSystemBannerContextChip}>{notificationOptInContextLabel(mode)}</span>}
        description={notificationOptInDescription(mode)}
        tags={NOTIFICATION_OPT_IN_BENEFITS}
        tagsAriaLabel="Tipi di avviso"
        onDismiss={onDismiss}
        dismissLabel="Chiudi suggerimento notifiche"
        actions={
          <>
            <button type="button" disabled={busy} className={dsSystemBannerPrimaryBtn} onClick={onEnable}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" label="Attivazione notifiche" className="mt-0" />
                  Attivazione…
                </span>
              ) : (
                "Attiva notifiche"
              )}
            </button>
            <button type="button" className={dsSystemBannerGhostBtn} onClick={onDismiss}>
              Non ora
            </button>
          </>
        }
      />
    </SystemBannerShell>
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
