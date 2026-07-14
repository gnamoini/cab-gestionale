export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

const IOS_UA = /iPad|iPhone|iPod/i;
const ANDROID_UA = /Android/i;

/** Rileva piattaforma da UA (testabile senza navigator). */
export function detectPwaPlatform(userAgent: string, maxTouchPoints = 0): PwaPlatform {
  const ua = userAgent.trim();
  if (!ua) return "unknown";
  if (IOS_UA.test(ua)) return "ios";
  if (ANDROID_UA.test(ua)) return "android";
  // iPadOS 13+ si presenta come Macintosh
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
  return "unknown";
}

/** Safari iOS e browser WebKit su iOS (incl. Chrome iOS) — nessun beforeinstallprompt. */
export function isIosSafariLike(userAgent: string, maxTouchPoints = 0): boolean {
  return detectPwaPlatform(userAgent, maxTouchPoints) === "ios";
}
