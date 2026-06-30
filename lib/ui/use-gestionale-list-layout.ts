"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  measureElementLayoutWidth,
  readGestionaleShellTierFromDom,
  resolveGestionaleShellViewportWidth,
} from "./gestionale-shell-layout";

export type GestionaleListLayoutTier = "xl" | "lg" | "md";
export type GestionaleListLayout = "desktop" | "mobile";

export const GESTIONALE_LIST_DESKTOP_ONLY_CLASS = "gestionale-list-desktop-only";
export const GESTIONALE_LIST_MOBILE_ONLY_CLASS = "gestionale-list-mobile-only";

const TIER_THRESHOLDS: Record<GestionaleListLayoutTier, { minViewport: number; minContainer: number }> = {
  xl: { minViewport: 1280, minContainer: 1024 },
  lg: { minViewport: 1024, minContainer: 896 },
  md: { minViewport: 768, minContainer: 640 },
};

export function gestionaleListLayoutViewportMq(tier: GestionaleListLayoutTier): string {
  return `(min-width: ${TIER_THRESHOLDS[tier].minViewport}px)`;
}

/** Tabella/desktop se viewport e container (pannello) sufficientemente larghi. */
export function resolveGestionaleListLayout(
  tier: GestionaleListLayoutTier,
  viewportWidth: number,
  containerWidth: number,
): GestionaleListLayout {
  const { minViewport, minContainer } = TIER_THRESHOLDS[tier];
  if (viewportWidth < minViewport) return "mobile";
  if (containerWidth < minContainer) return "mobile";
  return "desktop";
}

export function gestionaleListLayoutClassName(layout: GestionaleListLayout): string {
  return layout === "desktop" ? "gestionale-list-layout-desktop" : "gestionale-list-layout-mobile";
}

/** Larghezza utile per layout lista (preview IDE: min container, main scroll, document). */
export function resolveGestionaleListEffectiveWidth(
  containerWidth: number,
  opts?: { mainScrollWidth?: number | null; documentClientWidth?: number },
): number {
  const mainWidth = opts?.mainScrollWidth ?? containerWidth;
  const documentWidth = opts?.documentClientWidth ?? containerWidth;
  return Math.max(0, Math.min(containerWidth, mainWidth, documentWidth));
}

/** @deprecated Usare resolveGestionaleShellViewportWidth — alias retrocompatibile. */
export function resolveGestionaleListViewportWidth(): number {
  return resolveGestionaleShellViewportWidth();
}

/** Larghezza container: min lungo catena antenati fino a main + colonna shell. */
export function resolveGestionaleListContainerWidth(el: HTMLElement): number {
  let width = measureElementLayoutWidth(el);
  if (width <= 0) width = Number.POSITIVE_INFINITY;

  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const w = measureElementLayoutWidth(node);
    if (w > 0) width = Math.min(width, w);
    if (node.matches("main.gestionale-scroll-y")) break;
    node = node.parentElement;
  }

  const main = el.closest("main.gestionale-scroll-y");
  if (main instanceof HTMLElement) {
    const w = measureElementLayoutWidth(main);
    if (w > 0) width = Math.min(width, w);
  }

  const shell = el.closest(".cab-app-shell");
  if (shell instanceof HTMLElement) {
    for (const child of shell.children) {
      if (child instanceof HTMLElement && child.classList.contains("flex-1")) {
        const w = measureElementLayoutWidth(child);
        if (w > 0) width = Math.min(width, w);
        break;
      }
    }
  }

  if (!Number.isFinite(width)) return 0;
  return Math.max(0, width);
}

export type UseGestionaleListLayoutOptions = {
  tier?: GestionaleListLayoutTier;
};

/**
 * Layout lista gestionale: breakpoint tier + larghezza container (preview IDE / split).
 * Attaccare `containerRef` alla root pagina (`*-scroll-scope` / `layoutPageRoot`).
 */
export function useGestionaleListLayout(options: UseGestionaleListLayoutOptions = {}) {
  const tier = options.tier ?? "xl";
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<GestionaleListLayout>("mobile");
  const syncRafRef = useRef(0);

  const sync = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;
    const shellTier = readGestionaleShellTierFromDom();
    if (shellTier === "mobile" || shellTier === "tablet") {
      setLayout("mobile");
      return;
    }
    const viewportWidth = resolveGestionaleShellViewportWidth();
    const containerWidth = resolveGestionaleListContainerWidth(el);
    const next = resolveGestionaleListLayout(tier, viewportWidth, containerWidth);
    setLayout((prev) => (prev === next ? prev : next));
  }, [tier]);

  const scheduleSync = useCallback(() => {
    if (syncRafRef.current) return;
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = 0;
      sync();
    });
  }, [sync]);

  useEffect(() => {
    scheduleSync();
    const el = containerRef.current;
    const main =
      el?.closest("main.gestionale-scroll-y") ??
      (typeof document !== "undefined"
        ? document.querySelector("main.gestionale-scroll-y")
        : null);
    const shellCol =
      typeof document !== "undefined"
        ? document.querySelector(".cab-app-shell > div.flex-1")
        : null;
    const shell =
      typeof document !== "undefined" ? document.querySelector(".cab-app-shell") : null;
    const mq = window.matchMedia(gestionaleListLayoutViewportMq(tier));
    mq.addEventListener("change", scheduleSync);
    window.addEventListener("resize", scheduleSync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleSync);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleSync();
          })
        : null;
    if (el && ro) ro.observe(el);
    if (main instanceof HTMLElement && ro) ro.observe(main);
    if (shellCol instanceof HTMLElement && ro) ro.observe(shellCol);
    if (shell instanceof HTMLElement && ro) ro.observe(shell);
    return () => {
      if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
      syncRafRef.current = 0;
      mq.removeEventListener("change", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      vv?.removeEventListener("resize", scheduleSync);
      ro?.disconnect();
    };
  }, [scheduleSync, tier]);

  return {
    containerRef,
    layout,
    layoutClassName: gestionaleListLayoutClassName(layout),
    tier,
  };
}
