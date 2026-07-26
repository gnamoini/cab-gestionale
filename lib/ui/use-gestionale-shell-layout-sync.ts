"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  GESTIONALE_SHELL_CONTENT_WIDTH_VAR,
  GESTIONALE_SHELL_TIER_ATTR,
  resolveGestionaleShellContentWidth,
  resolveGestionaleShellTier,
  resolveHostLayoutWidth,
  syncHostLayoutWidthCssVars,
  type GestionaleShellTier,
} from "./gestionale-shell-layout";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyLogBoot, lazyTrackStoreUpdate } from "@/lib/observability/boot-investigation-lazy";

export type GestionaleShellTierState = {
  tier: GestionaleShellTier;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Shell compatta (hamburger, no sidebar fissa) per mobile + tablet. */
  isCompactShell: boolean;
};

/** @deprecated Usare `GestionaleShellTierState` + CSS var per contentWidth. */
export type GestionaleShellLayoutState = GestionaleShellTierState & {
  contentWidth: number;
};

export type UseGestionaleShellLayoutSyncRefs = {
  shellRef: RefObject<HTMLElement | null>;
  shellColRef: RefObject<HTMLElement | null>;
  mainRef?: RefObject<HTMLElement | null>;
};

/** Stato iniziale identico SSR + primo render client (evita hydration mismatch tier shell). */
const SSR_SAFE_SHELL_TIER_STATE: GestionaleShellTierState = {
  tier: "mobile",
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isCompactShell: true,
};

/** Tier da host viewport — contentWidth su CSS var, non in React state. */
function toShellTierState(hostWidth: number): GestionaleShellTierState {
  const tier = resolveGestionaleShellTier(hostWidth);
  return {
    tier,
    isMobile: tier === "mobile",
    isTablet: tier === "tablet",
    isDesktop: tier === "desktop",
    isCompactShell: tier !== "desktop",
  };
}

function shellTierStateEquals(a: GestionaleShellTierState, b: GestionaleShellTierState): boolean {
  return a.tier === b.tier;
}

export function useGestionaleShellLayoutSync(
  refs: UseGestionaleShellLayoutSyncRefs,
): GestionaleShellTierState {
  const [state, setState] = useState<GestionaleShellTierState>(SSR_SAFE_SHELL_TIER_STATE);
  const syncRafRef = useRef(0);
  const syncCountRef = useRef(0);
  const syncWindowStartRef = useRef(0);
  const prevTierRef = useRef<GestionaleShellTier | null>(null);

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
    const hostWidth = resolveHostLayoutWidth();
    const next = toShellTierState(hostWidth);

    const shell = refs.shellRef.current;
    if (shell instanceof HTMLElement) {
      shell.setAttribute(GESTIONALE_SHELL_TIER_ATTR, next.tier);
      shell.style.setProperty(GESTIONALE_SHELL_CONTENT_WIDTH_VAR, `${Math.round(contentWidth)}px`);
      shell.style.minWidth = "0";
      shell.style.maxWidth = "100%";
      shell.style.width = "100%";
    }

    setState((prev) => (shellTierStateEquals(prev, next) ? prev : next));

    if (isBootInvestigationEnabled()) {
      syncCountRef.current += 1;
      const now = Date.now();
      if (syncWindowStartRef.current === 0) syncWindowStartRef.current = now;
      const prevTier = prevTierRef.current;
      if (prevTier !== next.tier) {
        lazyTrackStoreUpdate("shellLayout", prevTier ?? null, { tier: next.tier, contentWidth });
        lazyLogBoot("RENDER", "shell_sync", { tier: next.tier, contentWidth }, "layout_change");
        prevTierRef.current = next.tier;
      }
      if (now - syncWindowStartRef.current >= 1000) {
        const rate = syncCountRef.current;
        if (rate > 5) {
          lazyLogBoot("RENDER", "shell_sync", { syncPerSec: rate }, "high_sync_rate");
        }
        syncCountRef.current = 0;
        syncWindowStartRef.current = now;
      }
    }
  }, [refs.shellRef, refs.shellColRef, refs.mainRef]);

  const scheduleSync = useCallback(() => {
    if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = requestAnimationFrame(() => {
        syncRafRef.current = 0;
        sync();
      });
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
    window.addEventListener("orientationchange", scheduleSync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleSync);

    const shellTierMqs =
      typeof window !== "undefined"
        ? [
            window.matchMedia("(min-width: 768px)"),
            window.matchMedia("(min-width: 1400px)"),
          ]
        : [];
    for (const mq of shellTierMqs) mq.addEventListener("change", scheduleSync);

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
      window.removeEventListener("orientationchange", scheduleSync);
      vv?.removeEventListener("resize", scheduleSync);
      for (const mq of shellTierMqs) mq.removeEventListener("change", scheduleSync);
      ro?.disconnect();
    };
  }, [scheduleSync, refs.shellRef, refs.shellColRef, refs.mainRef]);

  return state;
}
