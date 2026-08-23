/** ponytail: dev-only — rimuovere mount + env quando finita la review banner */
export function isDevAllBannersPreviewEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.NEXT_PUBLIC_DEV_ALL_BANNERS === "0") return false;
  if (process.env.NEXT_PUBLIC_DEV_ALL_BANNERS === "1") return true;
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("devBanners") === "1";
  }
  return false;
}

export const DEV_ALL_BANNERS_SESSION_KEY = "cab:dev-all-banners-dismissed";
