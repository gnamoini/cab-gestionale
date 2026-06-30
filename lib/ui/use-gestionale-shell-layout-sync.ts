"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  GESTIONALE_SHELL_CONTENT_WIDTH_VAR,
  GESTIONALE_SHELL_TIER_ATTR,
  resolveGestionaleShellContentWidth,
  resolveGestionaleShellTier,
  syncHostLayoutWidthCssVars,
  type GestionaleShellTier,
} from "./gestionale-shell-layout";
import { isBootInvestigationEnabled, logBoot, trackStoreUpdate } from "@/lib/observability/boot-investigation";

export type GestionaleShellLayoutState = {
  tier: GestionaleShellTier;
  contentWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Shell compatta (hamburger, no sidebar fissa) per mobile + tablet. */
  isCompactShell: boolean;
};

export type UseGestionaleShellLayoutSyncRefs = {
  shellRef: RefObject<HTMLElement | null>;
  shellColRef: RefObject<HTMLElement | null>;
  mainRef?: RefObject<HTMLElement | null>;
};

/** Stato iniziale identico SSR + primo render client (evita hydration mismatch tier shell). */
const SSR_SAFE_SHELL_LAYOUT_STATE: GestionaleShellLayoutState = {
  tier: "mobile",
  contentWidth: 0,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isCompactShell: true,
};

function toShellLayoutState(contentWidth: number): GestionaleShellLayoutState {
  const tier = resolveGestionaleShellTier(contentWidth);
  return {
    tier,
    contentWidth,
    isMobile: tier === "mobile",
    isTablet: tier === "tablet",
    isDesktop: tier === "desktop",
    isCompactShell: tier !== "desktop",
  };
}

function shellLayoutStateEquals(a: GestionaleShellLayoutState, b: GestionaleShellLayoutState): boolean {
  return a.tier === b.tier && a.contentWidth === b.contentWidth;
}

export function useGestionaleShellLayoutSync(
  refs: UseGestionaleShellLayoutSyncRefs,
): GestionaleShellLayoutState {
  const [state, setState] = useState<GestionaleShellLayoutState>(SSR_SAFE_SHELL_LAYOUT_STATE);
  const syncRafRef = useRef(0);
  const syncCountRef = useRef(0);
  const syncWindowStartRef = useRef(0);
  const prevLayoutRef = useRef<{ tier: GestionaleShellTier; contentWidth: number } | null>(null);

  const sync = useCallback(() => {
    if (typeof window === "undefined") return;

    syncHostLayoutWidthCssVars({
      shellEl: refs.shellRef.current,
      mainEl: refs.mainRef?.current,
    });

    const contentWidth = resolveGestionaleShellContentWidth({
      shellEl: refs.shellRef.current,
      shellColEl: refs.shellColRef.current,
      mainEl: refs.mainRef?.current,
    });
    const next = toShellLayoutState(contentWidth);

    const shell = refs.shellRef.current;
    if (shell instanceof HTMLElement) {
      shell.setAttribute(GESTIONALE_SHELL_TIER_ATTR, next.tier);
      shell.style.setProperty(GESTIONALE_SHELL_CONTENT_WIDTH_VAR, `${Math.round(contentWidth)}px`);
      shell.style.minWidth = "0";
      shell.style.maxWidth = "100%";
      shell.style.width = "100%";
    }

    setState((prev) => (shellLayoutStateEquals(prev, next) ? prev : next));

    if (isBootInvestigationEnabled()) {
      syncCountRef.current += 1;
      const now = Date.now();
      if (syncWindowStartRef.current === 0) syncWindowStartRef.current = now;
      const prevLayout = prevLayoutRef.current;
      if (!prevLayout || prevLayout.tier !== next.tier || prevLayout.contentWidth !== next.contentWidth) {
        trackStoreUpdate("shellLayout", prevLayout ?? null, { tier: next.tier, contentWidth: next.contentWidth });
        logBoot("RENDER", "shell_sync", { tier: next.tier, contentWidth: next.contentWidth }, "layout_change");
        prevLayoutRef.current = { tier: next.tier, contentWidth: next.contentWidth };
      }
      if (now - syncWindowStartRef.current >= 1000) {
        const rate = syncCountRef.current;
        if (rate > 5) {
          logBoot("RENDER", "shell_sync", { syncPerSec: rate }, "high_sync_rate");
        }
        syncCountRef.current = 0;
        syncWindowStartRef.current = now;
      }
    }
  }, [refs.shellRef, refs.shellColRef, refs.mainRef]);

  const scheduleSync = useCallback(() => {
    if (syncRafRef.current) return;
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = 0;
      sync();
    });
  }, [sync]);

  useLayoutEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    scheduleSync();

    const shell = refs.shellRef.current;
    const shellCol = refs.shellColRef.current;
    const main = refs.mainRef?.current;

    window.addEventListener("resize", scheduleSync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleSync);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleSync();
          })
        : null;

    if (shell && ro) ro.observe(shell);
    if (shellCol && ro) ro.observe(shellCol);
    if (main && ro) ro.observe(main);

    return () => {
      if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
      syncRafRef.current = 0;
      window.removeEventListener("resize", scheduleSync);
      vv?.removeEventListener("resize", scheduleSync);
      ro?.disconnect();
    };
  }, [scheduleSync, refs.shellRef, refs.shellColRef, refs.mainRef]);

  return state;
}
