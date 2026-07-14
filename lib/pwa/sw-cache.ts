export const PWA_PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-512x512-maskable.png",
] as const;

export type PwaCacheKind = "static" | "images" | "fonts" | "pages";

export function pwaCacheName(kind: PwaCacheKind, version: string): string {
  return `cab-pwa-${kind}-${version}`;
}
