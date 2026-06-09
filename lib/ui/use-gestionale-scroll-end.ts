"use client";

import { useEffect, type RefObject } from "react";

const SCROLL_END_ENTER_THRESHOLD_PX = 4;
const SCROLL_END_EXIT_THRESHOLD_PX = 24;

function distanceFromScrollEnd(el: HTMLElement): number {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

function syncScrollEndState(el: HTMLElement): void {
  const dist = distanceFromScrollEnd(el);
  const atEnd = el.hasAttribute("data-cab-scroll-at-end");

  if (!atEnd && dist <= SCROLL_END_ENTER_THRESHOLD_PX) {
    el.setAttribute("data-cab-scroll-at-end", "true");
  } else if (atEnd && dist > SCROLL_END_EXIT_THRESHOLD_PX) {
    el.removeAttribute("data-cab-scroll-at-end");
  }
}

/**
 * Imposta `data-cab-scroll-at-end` sul main gestionale quando lo scroll raggiunge il fondo.
 * Abilita il gradiente di feedback in globals.css (sul sentinel `.gestionale-scroll-end-pad`).
 */
export function useGestionaleScrollEnd(mainRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let rafId = 0;

    const scheduleSync = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        syncScrollEndState(el);
      });
    };

    syncScrollEndState(el);
    el.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });

    const ro = new ResizeObserver(scheduleSync);
    ro.observe(el);
    const content = el.firstElementChild;
    if (content instanceof HTMLElement) {
      ro.observe(content);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      ro.disconnect();
      el.removeAttribute("data-cab-scroll-at-end");
    };
  }, [mainRef]);
}
