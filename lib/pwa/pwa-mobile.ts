import { isPwaStandaloneMode, resolvePwaDisplayMode } from "@/lib/pwa/pwa-display-mode";
import { detectPwaPlatform } from "@/lib/pwa/pwa-platform";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { getVapidPublicKey, isWebPushSupported } from "@/lib/pwa/push-client";
import { supportsPwaAppBadge } from "@/lib/pwa/pwa-notification-badge";

export function isMobilePwaContext(input?: {
  userAgent?: string;
  maxTouchPoints?: number;
  matchMedia?: (query: string) => { matches: boolean };
  navigatorStandalone?: boolean;
}): boolean {
  const ua = input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const maxTouchPoints =
    input?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  const platform = detectPwaPlatform(ua, maxTouchPoints);
  if (platform !== "ios" && platform !== "android") return false;

  const mode = resolvePwaDisplayMode({
    matchMedia: input?.matchMedia,
    navigatorStandalone: input?.navigatorStandalone,
  });
  return isPwaStandaloneMode(mode);
}

export function isMobileHandheldPlatform(input?: {
  userAgent?: string;
  maxTouchPoints?: number;
}): boolean {
  const ua = input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const maxTouchPoints =
    input?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  const platform = detectPwaPlatform(ua, maxTouchPoints);
  return platform === "ios" || platform === "android";
}

/** Mobile contexts where Web Push can deliver with the app closed. */
export function isMobileBackgroundPushEligible(input?: {
  userAgent?: string;
  maxTouchPoints?: number;
  matchMedia?: (query: string) => { matches: boolean };
  navigatorStandalone?: boolean;
}): boolean {
  const ua = input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const maxTouchPoints =
    input?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  const platform = detectPwaPlatform(ua, maxTouchPoints);
  if (platform === "ios") return isMobilePwaContext(input);
  if (platform === "android") return true;
  return false;
}

export function supportsWebPushMobile(): boolean {
  return PWA_PUSH_ENABLED && isWebPushSupported() && Boolean(getVapidPublicKey());
}

export function isIosSafari(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return isPwaStandaloneMode(
    resolvePwaDisplayMode({
      matchMedia: (q) => window.matchMedia(q),
      navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    }),
  );
}

export { supportsPwaAppBadge };
