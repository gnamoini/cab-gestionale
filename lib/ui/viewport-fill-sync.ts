import { resolveHostLayoutWidth } from "./gestionale-shell-layout";

/**
 * Sincronizza dimensioni viewport su CSS vars — fallback quando dvh/svw non si aggiornano al resize
 * (webview IDE, iOS Safari, drawer + scroll lock).
 */
export function syncAppViewportFill(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  const vv = window.visualViewport;
  const hostWidth = resolveHostLayoutWidth();
  const w = Math.round(
    Math.min(
      hostWidth > 0 ? hostWidth : window.innerWidth,
      root.clientWidth > 0 ? root.clientWidth : window.innerWidth,
      vv?.width ?? window.innerWidth,
      window.innerWidth,
    ),
  );
  const h = Math.round(
    Math.max(root.clientHeight, vv?.height ?? 0, window.innerHeight),
  );

  root.style.setProperty("--cab-app-width", `${w}px`);
  root.style.setProperty("--cab-app-height", `${h}px`);
}

export const cabAppViewportFillClass =
  "h-[var(--cab-app-height,100dvh)] min-h-[var(--cab-app-height,100dvh)] w-full min-w-0 max-w-full";
