"use client";

import { useEffect } from "react";
import { getBodyScrollLockDebugState } from "@/lib/ui/body-scroll-lock-manager";

const DEBUG_ENDPOINT = "http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769";
const DEBUG_SESSION = "b1d6c0";

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "resize",
) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": DEBUG_SESSION },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function collectFixedOverlays() {
  if (typeof document === "undefined") return [];
  const out: Array<Record<string, string | number>> = [];
  for (const el of document.querySelectorAll("*")) {
    if (!(el instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(el);
    if (style.position !== "fixed" || style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < window.innerWidth * 0.85 || rect.height < window.innerHeight * 0.85) continue;
    out.push({
      tag: el.tagName,
      cls: typeof el.className === "string" ? el.className.slice(0, 80) : "",
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      opacity: style.opacity,
      zIndex: style.zIndex,
      bg: style.backgroundColor.slice(0, 40),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function probeLayout(trigger: string, runId = "resize") {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const shell = document.querySelector(".cab-app-shell");
  const shellRect = shell?.getBoundingClientRect();
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const root = document.documentElement;
  const vv = window.visualViewport;
  const lock = getBodyScrollLockDebugState();
  const drawerRoot = document.querySelector(".cab-nav-drawer-backdrop")?.closest("[role='presentation']");
  const drawerStyle = drawerRoot instanceof HTMLElement ? window.getComputedStyle(drawerRoot) : null;
  const loadingOverlay = document.querySelector("[class*='fixed'][class*='inset-0']");

  const widthGap = window.innerWidth - (shellRect?.width ?? 0);
  const heightGap = window.innerHeight - (shellRect?.height ?? 0);

  debugLog(
    "resize-layout-debug-probe.tsx:probeLayout",
    "layout snapshot",
    {
      trigger,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      vvWidth: vv?.width ?? null,
      vvHeight: vv?.height ?? null,
      shellWidth: shellRect ? Math.round(shellRect.width) : null,
      shellHeight: shellRect ? Math.round(shellRect.height) : null,
      shellRight: shellRect ? Math.round(shellRect.right) : null,
      shellBottom: shellRect ? Math.round(shellRect.bottom) : null,
      widthGap: Math.round(widthGap),
      heightGap: Math.round(heightGap),
      bodyPosition: bodyStyle.position,
      bodyOverflow: bodyStyle.overflow,
      bodyWidth: bodyStyle.width,
      bodyInlinePosition: document.body.style.position,
      bodyInlineWidth: document.body.style.width,
      htmlBg: htmlStyle.backgroundColor,
      bodyBg: bodyStyle.backgroundColor,
      cabVvHeight: root.style.getPropertyValue("--cab-vv-height") || htmlStyle.getPropertyValue("--cab-vv-height"),
      cabAppWidth: root.style.getPropertyValue("--cab-app-width") || htmlStyle.getPropertyValue("--cab-app-width"),
      cabAppHeight: root.style.getPropertyValue("--cab-app-height") || htmlStyle.getPropertyValue("--cab-app-height"),
      shellComputedHeight: shell instanceof HTMLElement ? Math.round(shell.getBoundingClientRect().height) : null,
      lockCount: lock.count,
      lockSources: lock.sources,
      lockUseFixed: lock.useFixedLock,
      drawerDisplay: drawerStyle?.display ?? null,
      drawerVisibility: drawerStyle?.visibility ?? null,
      loadingOverlayPresent: Boolean(loadingOverlay),
      fixedOverlays: collectFixedOverlays(),
      mismatch: widthGap > 2 || heightGap > 2,
    },
    "H1-H5",
    runId,
  );
}

/** Debug session probe — resize layout black-bar investigation. */
export function ResizeLayoutDebugProbe() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(trigger: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => probeLayout(trigger), 120);
    }

    const onResize = () => schedule("resize");
    const onVvResize = () => schedule("vv-resize");

    probeLayout("mount", "initial");
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onVvResize);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onVvResize);
    };
  }, []);

  return null;
}
