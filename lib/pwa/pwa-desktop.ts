import { isPwaStandaloneMode, resolvePwaDisplayMode } from "@/lib/pwa/pwa-display-mode";
import { detectPwaPlatform } from "@/lib/pwa/pwa-platform";

/** Note QA per finestra PWA desktop — non altera shell app. */
export const PWA_DESKTOP_WINDOW_FEATURES =
  "standalone display, no browser chrome, resize expected on desktop OS" as const;

export function isDesktopInstalledPwa(input?: {
  userAgent?: string;
  maxTouchPoints?: number;
  matchMedia?: (query: string) => { matches: boolean };
  navigatorStandalone?: boolean;
}): boolean {
  const ua = input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const maxTouchPoints =
    input?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  const platform = detectPwaPlatform(ua, maxTouchPoints);
  if (platform !== "desktop") return false;

  const mode = resolvePwaDisplayMode({
    matchMedia: input?.matchMedia,
    navigatorStandalone: input?.navigatorStandalone,
  });
  return isPwaStandaloneMode(mode);
}
