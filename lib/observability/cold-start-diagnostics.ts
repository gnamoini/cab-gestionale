/**
 * Cold start diagnostics — three buckets: native launch gap (estimate), web startup, application startup.
 * Gated by navigation-boot-gate; lazy-mounted via ColdStartDiagnosticsBridge.
 */

import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";
import {
  CAB_COLD_START_MARK,
  CAB_COLD_START_MEASURE,
  CAB_LAST_VISIBILITY_HIDDEN_KEY,
} from "@/lib/observability/cold-start-mark-names";
import { detectPwaPlatform } from "@/lib/pwa/pwa-platform";
import { isPwaStandalone } from "@/lib/pwa/pwa-mobile";

export type ColdStartConfidence = "very_low" | "low" | "medium";

export type ColdStartReport = {
  buckets: {
    nativeLaunchGap: {
      estimatedMs: number | null;
      confidence: ColdStartConfidence;
      method: "visibility_to_timeOrigin";
      disclaimer: string;
    };
    webStartup: {
      startMs: number;
      endMs: number | null;
      durationMs: number | null;
      phases: {
        ttfbMs: number | null;
        staticBootMs: number | null;
        fcpMs: number | null;
      };
    };
    applicationStartup: {
      startMs: number | null;
      endMs: number | null;
      durationMs: number | null;
      phases: Record<string, number | null>;
    };
  };
  staticToReactSequence: {
    marks: Record<string, number | null>;
    measures: Record<string, number | null>;
  };
  measurable: {
    navigation: Record<string, number | null>;
    paint: Record<string, number | null>;
    sw: {
      controllerAtDomContentLoaded: boolean;
      controllerAtReport: boolean;
      readyMs: number | null;
      controllerChangeCount: number;
    };
  };
  meta: {
    route: string;
    pwaMode: boolean;
    platform: string;
    collectedAt: string;
  };
};

const NATIVE_GAP_DISCLAIMER =
  "Stima approssimativa tra ultimo visibility hidden e timeOrigin. Non rappresenta il momento esatto in cui l'utente vede il primo pixel né la fine precisa della splash Android.";

let initialized = false;
let paintObserver: PerformanceObserver | null = null;
let controllerChangeCount = 0;
let swControllerAtDomContentLoaded = false;
let swReadyMs: number | null = null;
let domContentLoadedRecorded = false;

function enabled(): boolean {
  return isNavigationBootDiagnosticsEnabled();
}

export function markColdStart(markName: string): void {
  if (!enabled()) return;
  try {
    performance.mark(markName);
  } catch {
    // ponytail: duplicate mark on remount
  }
}

function getMarkTime(markName: string): number | null {
  const entries = performance.getEntriesByName(markName, "mark");
  if (entries.length === 0) return null;
  return entries[entries.length - 1]!.startTime;
}

function getPaintTime(name: string): number | null {
  const entries = performance.getEntriesByName(name, "paint");
  if (entries.length === 0) return null;
  return entries[0]!.startTime;
}

function safeMeasure(name: string, startMark: string, endMark: string): number | null {
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, "measure");
    const last = entries[entries.length - 1];
    return last ? last.duration : null;
  } catch {
    return null;
  }
}

function estimateNativeLaunchGap(): ColdStartReport["buckets"]["nativeLaunchGap"] {
  let estimatedMs: number | null = null;
  let confidence: ColdStartConfidence = "very_low";
  try {
    const raw = sessionStorage.getItem(CAB_LAST_VISIBILITY_HIDDEN_KEY);
    if (raw) {
      const hiddenAt = Number(raw);
      if (Number.isFinite(hiddenAt) && hiddenAt > 0) {
        const gap = performance.timeOrigin - hiddenAt;
        if (gap > 0 && gap < 120_000) {
          estimatedMs = Math.round(gap);
          confidence = gap < 30_000 ? "low" : "very_low";
        }
      }
    }
  } catch {
    // sessionStorage blocked
  }
  return {
    estimatedMs,
    confidence,
    method: "visibility_to_timeOrigin",
    disclaimer: NATIVE_GAP_DISCLAIMER,
  };
}

function readNavigationTiming(): Record<string, number | null> {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) {
    return {
      navigationStart: 0,
      requestStart: null,
      responseStart: null,
      domInteractive: null,
      domContentLoadedEventEnd: null,
      loadEventEnd: null,
    };
  }
  const origin = nav.startTime;
  return {
    navigationStart: 0,
    requestStart: Math.round(nav.requestStart - origin),
    responseStart: Math.round(nav.responseStart - origin),
    domInteractive: Math.round(nav.domInteractive - origin),
    domContentLoadedEventEnd: Math.round(nav.domContentLoadedEventEnd - origin),
    loadEventEnd: Math.round(nav.loadEventEnd - origin),
  };
}

function buildStaticToReactMeasures(): Record<string, number | null> {
  const pairs: Array<[string, string, string]> = [
    [CAB_COLD_START_MEASURE.staticToFp, CAB_COLD_START_MARK.staticBootVisible, CAB_COLD_START_MARK.firstPaint],
    [CAB_COLD_START_MEASURE.fpToReact, CAB_COLD_START_MARK.firstPaint, CAB_COLD_START_MARK.reactRootMount],
    [CAB_COLD_START_MEASURE.reactToBootMount, CAB_COLD_START_MARK.reactRootMount, CAB_COLD_START_MARK.appBootScreenMount],
    [
      CAB_COLD_START_MEASURE.bootMountToStaticHidden,
      CAB_COLD_START_MARK.appBootScreenMount,
      CAB_COLD_START_MARK.appBootStaticHidden,
    ],
    [
      CAB_COLD_START_MEASURE.staticHiddenToDismiss,
      CAB_COLD_START_MARK.appBootStaticHidden,
      CAB_COLD_START_MARK.appBootDismiss,
    ],
  ];
  const out: Record<string, number | null> = {};
  for (const [name, start, end] of pairs) {
    const duration = safeMeasure(name, start, end);
    out[name] = duration != null ? Math.round(duration) : null;
  }
  return out;
}

export function buildColdStartReport(): ColdStartReport {
  const fcpMs = getPaintTime("first-contentful-paint");
  const fpMs = getPaintTime("first-paint");
  const staticBootMs = getMarkTime(CAB_COLD_START_MARK.staticBootVisible);
  const usefulUiMs = getMarkTime(CAB_COLD_START_MARK.firstUsefulUi);
  const nav = readNavigationTiming();
  const webEndMs = fcpMs ?? staticBootMs;
  const appStartMs = staticBootMs ?? fcpMs;

  const staticMarks: Record<string, number | null> = {};
  for (const value of Object.values(CAB_COLD_START_MARK)) {
    staticMarks[value] = getMarkTime(value);
  }
  if (fpMs != null) staticMarks[CAB_COLD_START_MARK.firstPaint] = fpMs;
  if (fcpMs != null) staticMarks[CAB_COLD_START_MARK.firstContentfulPaint] = fcpMs;

  const appPhases: Record<string, number | null> = {
    reactRootMount: getMarkTime(CAB_COLD_START_MARK.reactRootMount),
    appBootScreenMount: getMarkTime(CAB_COLD_START_MARK.appBootScreenMount),
    appBootStaticHidden: getMarkTime(CAB_COLD_START_MARK.appBootStaticHidden),
    appBootDismiss: getMarkTime(CAB_COLD_START_MARK.appBootDismiss),
    authInitEnd: getMarkTime(CAB_COLD_START_MARK.authInitEnd),
    hydrationEnd: getMarkTime(CAB_COLD_START_MARK.hydrationEnd),
    loadingScreenVisible: getMarkTime(CAB_COLD_START_MARK.loadingScreenVisible),
    shellReady: null,
  };

  return {
    buckets: {
      nativeLaunchGap: estimateNativeLaunchGap(),
      webStartup: {
        startMs: 0,
        endMs: webEndMs != null ? Math.round(webEndMs) : null,
        durationMs: webEndMs != null ? Math.round(webEndMs) : null,
        phases: {
          ttfbMs: nav.responseStart,
          staticBootMs: staticBootMs != null ? Math.round(staticBootMs) : null,
          fcpMs: fcpMs != null ? Math.round(fcpMs) : null,
        },
      },
      applicationStartup: {
        startMs: appStartMs != null ? Math.round(appStartMs) : null,
        endMs: usefulUiMs != null ? Math.round(usefulUiMs) : null,
        durationMs:
          appStartMs != null && usefulUiMs != null ? Math.round(usefulUiMs - appStartMs) : null,
        phases: Object.fromEntries(
          Object.entries(appPhases).map(([k, v]) => [k, v != null ? Math.round(v) : null]),
        ),
      },
    },
    staticToReactSequence: {
      marks: Object.fromEntries(
        Object.entries(staticMarks).map(([k, v]) => [k, v != null ? Math.round(v) : null]),
      ),
      measures: buildStaticToReactMeasures(),
    },
    measurable: {
      navigation: nav,
      paint: {
        firstPaint: fpMs != null ? Math.round(fpMs) : null,
        firstContentfulPaint: fcpMs != null ? Math.round(fcpMs) : null,
      },
      sw: {
        controllerAtDomContentLoaded: swControllerAtDomContentLoaded,
        controllerAtReport: Boolean(navigator.serviceWorker?.controller),
        readyMs: swReadyMs != null ? Math.round(swReadyMs) : null,
        controllerChangeCount,
      },
    },
    meta: {
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      pwaMode: typeof window !== "undefined" ? isPwaStandalone() : false,
      platform:
        typeof navigator !== "undefined"
          ? detectPwaPlatform(navigator.userAgent, navigator.maxTouchPoints)
          : "unknown",
      collectedAt: new Date().toISOString(),
    },
  };
}

export function exposeColdStartReport(): void {
  if (typeof window === "undefined" || !enabled()) return;
  const report = buildColdStartReport();
  (window as Window & { __cabColdStartReport?: ColdStartReport }).__cabColdStartReport = report;
}

function installVisibilityPersistence(): void {
  if (typeof document === "undefined") return;
  const save = () => {
    if (document.visibilityState !== "hidden") return;
    try {
      sessionStorage.setItem(CAB_LAST_VISIBILITY_HIDDEN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };
  document.addEventListener("visibilitychange", save);
}

function installPaintObserver(): void {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-paint" || entry.name === "first-contentful-paint") {
          try {
            performance.mark(entry.name === "first-paint" ? CAB_COLD_START_MARK.firstPaint : CAB_COLD_START_MARK.firstContentfulPaint);
          } catch {
            // ignore
          }
        }
      }
      exposeColdStartReport();
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {
    paintObserver = null;
  }
}

function installServiceWorkerObservers(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const recordDom = () => {
    if (domContentLoadedRecorded) return;
    domContentLoadedRecorded = true;
    swControllerAtDomContentLoaded = Boolean(navigator.serviceWorker.controller);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", recordDom, { once: true });
  } else {
    recordDom();
  }
  const started = performance.now();
  void navigator.serviceWorker.ready
    .then(() => {
      swReadyMs = performance.now() - started;
      exposeColdStartReport();
    })
    .catch(() => undefined);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    controllerChangeCount += 1;
    exposeColdStartReport();
  });
}

const USEFUL_UI_SELECTORS: Array<{ prefix: string; selector: string }> = [
  { prefix: "/dashboard", selector: "main h1" },
  { prefix: "/lavorazioni", selector: "main" },
  { prefix: "/mezzi", selector: "main h1" },
  { prefix: "/magazzino", selector: "main h1" },
];

function resolveUsefulUiSelector(pathname: string): string {
  const match = USEFUL_UI_SELECTORS.find((s) => pathname.startsWith(s.prefix));
  return match?.selector ?? ".cab-app-shell";
}

function watchFirstUsefulUi(): void {
  if (typeof window === "undefined" || !enabled()) return;
  if (getMarkTime(CAB_COLD_START_MARK.firstUsefulUi) != null) return;

  const selector = resolveUsefulUiSelector(window.location.pathname);
  const tryMark = () => {
    if (getMarkTime(CAB_COLD_START_MARK.firstUsefulUi) != null) return true;
    const el = document.querySelector(selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    markColdStart(CAB_COLD_START_MARK.firstUsefulUi);
    exposeColdStartReport();
    return true;
  };

  if (tryMark()) return;

  const observer = new MutationObserver(() => {
    if (tryMark()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let frames = 0;
  const maxFrames = 600;
  const poll = () => {
    frames += 1;
    if (tryMark() || frames >= maxFrames) {
      observer.disconnect();
      return;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

function watchLoadingScreen(): void {
  if (typeof window === "undefined" || !enabled()) return;
  const tryMark = () => {
    if (getMarkTime(CAB_COLD_START_MARK.loadingScreenVisible) != null) return true;
    const shell = document.querySelector(".cab-app-shell");
    if (shell) {
      markColdStart(CAB_COLD_START_MARK.loadingScreenVisible);
      exposeColdStartReport();
      return true;
    }
    return false;
  };
  if (tryMark()) return;
  const observer = new MutationObserver(() => {
    if (tryMark()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function initColdStartDiagnostics(): void {
  if (!enabled() || initialized || typeof window === "undefined") return;
  initialized = true;
  installVisibilityPersistence();
  installPaintObserver();
  installServiceWorkerObservers();
  watchLoadingScreen();
  watchFirstUsefulUi();
  exposeColdStartReport();
  window.addEventListener("load", () => exposeColdStartReport(), { once: true });
}
