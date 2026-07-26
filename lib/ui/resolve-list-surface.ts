/** SSOT vista lista — tabella vs card. Risoluzione pre-render (server), mai in useEffect. */

export type ListSurface = "table" | "cards";

export const GESTIONALE_LIST_SURFACE_COOKIE = "gestionale-list-surface";

export type GestionaleListTier = "xl" | "lg" | "md";

/** Soglia viewport per cookie sync client (allineata tier xl). */
export const LIST_SURFACE_TABLE_MIN_VIEWPORT = 1280;

export type ResolveListSurfaceInput = {
  cookieValue?: string | null;
  viewportWidthHint?: number | null;
  userAgent?: string | null;
};

function parseListSurfaceCookie(raw: string | null | undefined): ListSurface | null {
  if (raw === "table" || raw === "cards") return raw;
  return null;
}

function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

/** Risoluzione pre-render — cookie → CH viewport → UA → default table. */
export function resolveListSurfaceFromRequest(input: ResolveListSurfaceInput): ListSurface {
  const fromCookie = parseListSurfaceCookie(input.cookieValue);
  if (fromCookie) return fromCookie;

  const vw = input.viewportWidthHint;
  if (typeof vw === "number" && Number.isFinite(vw) && vw > 0) {
    return vw >= LIST_SURFACE_TABLE_MIN_VIEWPORT ? "table" : "cards";
  }

  if (isMobileUserAgent(input.userAgent)) return "cards";

  return "table";
}

/** Viewport hint da header Sec-CH-Viewport-Width. */
export function parseViewportWidthClientHint(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Cookie sync client — viewport-only, prossima navigazione. */
export function resolveListSurfaceForViewportWidth(viewportWidth: number): ListSurface {
  return viewportWidth >= LIST_SURFACE_TABLE_MIN_VIEWPORT ? "table" : "cards";
}
