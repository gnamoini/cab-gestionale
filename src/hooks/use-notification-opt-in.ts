"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dismissDesktopNotificationPrompt,
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import {
  readNotificationOptInDecision,
  shouldShowNotificationMenuEnable,
  shouldShowNotificationOptInBanner,
  writeNotificationOptInAccepted,
  writeNotificationOptInDeclined,
  type NotificationOptInDecision,
} from "@/lib/notifications/notification-opt-in-decision";
import type { NotificationOptInMode } from "@/lib/notifications/notification-opt-in-copy";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";
import { isMobileHandheldPlatform } from "@/lib/pwa/pwa-mobile";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import type { PushPermissionState } from "@/lib/pwa/push-types";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";

export type NotificationEnableResult = "granted" | "denied" | "error" | "unsupported";

function resolveOptInMode(): NotificationOptInMode {
  return shouldPreferPwaPushOverDesktopPrompt() ? "push" : "browser";
}

function isPushActive(state: PushPermissionState): boolean {
  return state === "granted";
}

function isDesktopActive(state: DesktopNotificationPermissionState): boolean {
  return state === "granted";
}

function canPromptPush(state: PushPermissionState): boolean {
  return state === "default" || state === "prompted";
}

function canPromptDesktop(state: DesktopNotificationPermissionState): boolean {
  return state === "default" || state === "denied";
}

export function useNotificationOptIn(enabled = true) {
  const push = usePwaPushOptIn();
  const mode = resolveOptInMode();
  const preferPush = mode === "push";

  const [decision, setDecision] = useState<NotificationOptInDecision>(() => readNotificationOptInDecision());
  const [desktopPermission, setDesktopPermission] = useState<DesktopNotificationPermissionState>(() =>
    getDesktopNotificationPermissionState(),
  );

  const syncState = useCallback(() => {
    setDecision(readNotificationOptInDecision());
    setDesktopPermission(getDesktopNotificationPermissionState());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    syncState();
    const onStorage = () => syncState();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, syncState]);

  const pushAvailable = PWA_PUSH_ENABLED && preferPush && push.permissionState !== "unsupported";
  const desktopAvailable = !preferPush && !isMobileHandheldPlatform();

  const isActive = preferPush ? isPushActive(push.permissionState) : isDesktopActive(desktopPermission);
  const canPrompt = preferPush ? canPromptPush(push.permissionState) : canPromptDesktop(desktopPermission);
  const channelAvailable = preferPush ? pushAvailable : desktopAvailable;

  const bannerVisible =
    enabled && channelAvailable && shouldShowNotificationOptInBanner({ decision, canPrompt, isActive });

  const menuEnableVisible =
    enabled && channelAvailable && shouldShowNotificationMenuEnable({ canPrompt, isActive });

  const declineOptIn = useCallback(() => {
    writeNotificationOptInDeclined();
    dismissDesktopNotificationPrompt();
    push.dismissPushOptIn();
    setDecision("declined");
  }, [push]);

  const enableOptIn = useCallback(async (): Promise<NotificationEnableResult> => {
    if (!channelAvailable) return "unsupported";

    if (preferPush) {
      const result = await push.enablePush();
      syncState();
      if (result === "granted") {
        writeNotificationOptInAccepted();
        setDecision("accepted");
        return "granted";
      }
      if (result === "denied") {
        writeNotificationOptInDeclined();
        setDecision("declined");
        return "denied";
      }
      return result === "unsupported" ? "unsupported" : "error";
    }

    const result = await requestDesktopNotificationPermissionInteractive();
    syncState();
    if (result === "granted") {
      writeNotificationOptInAccepted();
      setDecision("accepted");
      return "granted";
    }
    if (result === "denied") {
      writeNotificationOptInDeclined();
      setDecision("declined");
      return "denied";
    }
    return "error";
  }, [channelAvailable, preferPush, push, syncState]);

  return {
    mode,
    decision,
    bannerVisible,
    menuEnableVisible,
    busy: push.busy,
    isActive,
    canPrompt,
    desktopPermission,
    pushPermissionState: push.permissionState,
    declineOptIn,
    enableOptIn,
    syncState,
  };
}
