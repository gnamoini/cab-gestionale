/**
 * Diagnostica viewport mobile — solo con NEXT_PUBLIC_MOBILE_VIEWPORT_DEBUG=1.
 */

import { subscribeGestionaleViewport } from "@/lib/ui/gestionale-viewport-orchestrator";
import { GESTIONALE_PAGE_SCROLL_SELECTOR } from "@/lib/ui/mobile-modal-behavior";

const THROTTLE_MS = 1000;
const HEADER_SELECTOR = ".cab-page-header-top-row";
const HAMBURGER_SELECTOR = ".cab-mobile-nav-open";
const PTR_CONTENT_SELECTOR = "main.gestionale-scroll-y > .will-change-transform";

export function isMobileViewportDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOBILE_VIEWPORT_DEBUG === "1";
}

function readPullTransform(): string {
  if (typeof document === "undefined") return "";
  const el = document.querySelector(PTR_CONTENT_SELECTOR);
  if (!(el instanceof HTMLElement)) return "";
  return el.style.transform;
}

function checkHeaderEscapedViewport(): void {
  const vv = window.visualViewport;
  const header =
    document.querySelector(HEADER_SELECTOR) ?? document.querySelector(HAMBURGER_SELECTOR);
  if (!vv || !(header instanceof HTMLElement)) return;
  const top = header.getBoundingClientRect().top;
  if (top < vv.offsetTop) {
    console.warn("[cab:mobile-viewport] header escaped viewport", {
      headerTop: top,
      offsetTop: vv.offsetTop,
    });
  }
}

export function mountMobileViewportDiagnostics(): (() => void) | undefined {
  if (typeof window === "undefined" || !isMobileViewportDebugEnabled()) return undefined;

  let lastLogAt = 0;

  const unsubscribe = subscribeGestionaleViewport((_snapshot, reason) => {
    const now = Date.now();
    if (now - lastLogAt < THROTTLE_MS) return;
    lastLogAt = now;

    const vv = window.visualViewport;
    const main = document.querySelector(GESTIONALE_PAGE_SCROLL_SELECTOR);
    const header =
      document.querySelector(HEADER_SELECTOR) ?? document.querySelector(HAMBURGER_SELECTOR);
    const headerTop =
      header instanceof HTMLElement ? header.getBoundingClientRect().top : null;

    console.info("[cab:mobile-viewport]", {
      reason,
      innerHeight: window.innerHeight,
      vvHeight: vv?.height ?? null,
      vvOffsetTop: vv?.offsetTop ?? null,
      docClientHeight: document.documentElement.clientHeight,
      bodyClientHeight: document.body.clientHeight,
      scrollY: window.scrollY,
      mainScrollTop: main instanceof HTMLElement ? main.scrollTop : null,
      headerTop,
      pullTransform: readPullTransform(),
      pwaStandalone: document.documentElement.classList.contains("pwa-standalone"),
      displayMode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
    });

    checkHeaderEscapedViewport();
  });

  return unsubscribe;
}
