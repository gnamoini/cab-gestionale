"use client";

import { useLayoutEffect, type RefObject } from "react";

const MAIN_SCROLL_SELECTOR = "main.gestionale-scroll-y";
const SIDEBAR_MIN_HEIGHT_PX = 160;

function readSidebarInsetPx(): number {
  if (typeof document === "undefined") return 12;
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = "var(--cab-settings-sidebar-inset, 0.75rem)";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? px : 12;
}

function findMainScroll(el: HTMLElement): HTMLElement | null {
  const main = el.closest(MAIN_SCROLL_SELECTOR);
  return main instanceof HTMLElement ? main : null;
}

/**
 * Altezza sidebar = scrollport main meno inset sticky simmetrico alto/basso (`--cab-settings-sidebar-inset`).
 */
export function useSettingsSidebarScrollportHeight(
  asideRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const aside = asideRef.current;
    if (!aside) return;

    const sync = () => {
      const main = findMainScroll(aside);
      if (!main) return;
      const insetPx = readSidebarInsetPx();
    const mainStyles = getComputedStyle(main);
    const mainPadBottom = Number.parseFloat(mainStyles.paddingBottom) || 0;
    const h = Math.max(SIDEBAR_MIN_HEIGHT_PX, main.clientHeight - insetPx * 2 - mainPadBottom);
      aside.style.setProperty("--cab-settings-sidebar-height", `${Math.round(h)}px`);
    };

    sync();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(aside);
    const main = findMainScroll(aside);
    if (main) ro?.observe(main);

    window.addEventListener("resize", sync, { passive: true });

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", sync);
      aside.style.removeProperty("--cab-settings-sidebar-height");
    };
  }, [enabled, asideRef]);
}
