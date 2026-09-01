/**
 * PWA render audit — browser vs installed PWA capability/cache snapshot.
 * Gated by NEXT_PUBLIC_PWA_RENDER_AUDIT=1; mounts via PwaRenderAuditBridge.
 */

import {
  formatAppBuildFooterLines,
  readAppCommitShort,
  readAppVersion,
  resolveAppEnvironment,
} from "@/lib/env/app-build-info";
import { isPwaRenderAuditEnabled } from "@/lib/observability/pwa-render-audit-gate";
import { isDesktopInstalledPwa } from "@/lib/pwa/pwa-desktop";
import { resolvePwaDisplayMode } from "@/lib/pwa/pwa-display-mode";

export type PwaRenderAssetHeader = {
  url: string;
  status: number;
  etag: string | null;
  cacheControl: string | null;
  lastModified: string | null;
  age: string | null;
};

export type PwaRenderSwFingerprint = {
  url: string;
  status: number;
  etag: string | null;
  cacheControl: string | null;
  lastModified: string | null;
  byteLength: number;
  sha256Prefix: string | null;
};

export type PwaRenderSnapshot = {
  collectedAt: string;
  build: {
    version: string;
    commit: string | null;
    environment: ReturnType<typeof resolveAppEnvironment>;
    footerLines: string[];
  };
  runtime: {
    userAgent: string;
    platform: string;
    devicePixelRatio: number;
    viewport: {
      innerWidth: number;
      innerHeight: number;
      visualViewport: {
        width: number;
        height: number;
        scale: number;
        offsetTop: number;
        offsetLeft: number;
      } | null;
    };
    displayMode: ReturnType<typeof resolvePwaDisplayMode>;
    pwaStandaloneClass: boolean;
    desktopInstalledPwa: boolean;
  };
  cssSupport: {
    backdropFilter: boolean;
    filter: boolean;
    colorMix: boolean;
    maskImage: boolean;
    clipPath: boolean;
  };
  webgl: boolean;
  serviceWorker: {
    controllerScriptUrl: string | null;
    registrationScope: string | null;
    cacheNames: string[];
  };
  loadedStaticUrls: string[];
};

function cssSupports(property: string, value: string): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  try {
    return CSS.supports(property, value);
  } catch {
    return false;
  }
}

function collectLoadedStaticUrls(): string[] {
  if (typeof performance === "undefined") return [];
  return performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.includes("/_next/static/") || name.endsWith("/sw.js"));
}

async function sha256Prefix(text: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

async function readResponseHeaders(url: string): Promise<PwaRenderAssetHeader> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  return {
    url,
    status: res.status,
    etag: res.headers.get("etag"),
    cacheControl: res.headers.get("cache-control"),
    lastModified: res.headers.get("last-modified"),
    age: res.headers.get("age"),
  };
}

export function collectPwaRenderSnapshot(): PwaRenderSnapshot {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;

  return {
    collectedAt: new Date().toISOString(),
    build: {
      version: readAppVersion(),
      commit: readAppCommitShort(),
      environment: resolveAppEnvironment(),
      footerLines: formatAppBuildFooterLines(),
    },
    runtime: {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      platform: typeof navigator !== "undefined" ? navigator.platform : "",
      devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
      viewport: {
        innerWidth: typeof window !== "undefined" ? window.innerWidth : 0,
        innerHeight: typeof window !== "undefined" ? window.innerHeight : 0,
        visualViewport: vv
          ? {
              width: vv.width,
              height: vv.height,
              scale: vv.scale,
              offsetTop: vv.offsetTop,
              offsetLeft: vv.offsetLeft,
            }
          : null,
      },
      displayMode: resolvePwaDisplayMode({
        matchMedia: typeof window !== "undefined" ? window.matchMedia.bind(window) : undefined,
        navigatorStandalone:
          typeof navigator !== "undefined"
            ? (navigator as Navigator & { standalone?: boolean }).standalone
            : undefined,
      }),
      pwaStandaloneClass:
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("pwa-standalone"),
      desktopInstalledPwa: isDesktopInstalledPwa(),
    },
    cssSupport: {
      backdropFilter: cssSupports("backdrop-filter", "blur(1px)"),
      filter: cssSupports("filter", "blur(1px)"),
      colorMix: cssSupports("color", "color-mix(in srgb, red 50%, blue)"),
      maskImage: cssSupports("mask-image", "linear-gradient(black, transparent)"),
      clipPath: cssSupports("clip-path", "inset(0)"),
    },
    webgl: (() => {
      if (typeof document === "undefined") return false;
      try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl") || canvas.getContext("webgl2"));
      } catch {
        return false;
      }
    })(),
    serviceWorker: {
      controllerScriptUrl: sw?.controller?.scriptURL ?? null,
      registrationScope: null,
      cacheNames: [],
    },
    loadedStaticUrls: collectLoadedStaticUrls(),
  };
}

export async function enrichPwaRenderSnapshot(base: PwaRenderSnapshot): Promise<PwaRenderSnapshot> {
  if (typeof caches === "undefined") return base;
  const cacheNames = await caches.keys();
  let registrationScope: string | null = null;
  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    const reg = await navigator.serviceWorker.getRegistration("/");
    registrationScope = reg?.scope ?? null;
  }
  return {
    ...base,
    serviceWorker: {
      ...base.serviceWorker,
      registrationScope,
      cacheNames,
    },
  };
}

export async function collectPwaRenderSwFingerprint(): Promise<PwaRenderSwFingerprint | null> {
  const url = typeof navigator !== "undefined" ? navigator.serviceWorker?.controller?.scriptURL : null;
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const text = await res.text();
  return {
    url,
    status: res.status,
    etag: res.headers.get("etag"),
    cacheControl: res.headers.get("cache-control"),
    lastModified: res.headers.get("last-modified"),
    byteLength: text.length,
    sha256Prefix: await sha256Prefix(text),
  };
}

/** Confronto header/fingerprint per sw.js e asset statici già caricati. */
export async function collectPwaRenderCacheParity(): Promise<{
  sw: PwaRenderSwFingerprint | null;
  swDirect: PwaRenderAssetHeader;
  loadedAssets: PwaRenderAssetHeader[];
}> {
  const sw = await collectPwaRenderSwFingerprint();
  const swDirect = await readResponseHeaders("/sw.js");
  const urls = [...new Set(collectLoadedStaticUrls())].slice(0, 12);
  const loadedAssets = await Promise.all(urls.map((url) => readResponseHeaders(url)));
  return { sw, swDirect, loadedAssets };
}

export async function exportPwaRenderAuditJson(): Promise<string> {
  const snapshot = await enrichPwaRenderSnapshot(collectPwaRenderSnapshot());
  const cacheParity = await collectPwaRenderCacheParity();
  return JSON.stringify({ snapshot, cacheParity }, null, 2);
}

declare global {
  interface Window {
    __cabPwaRenderAudit?: () => Promise<string>;
    __cabPwaRenderCacheParity?: () => ReturnType<typeof collectPwaRenderCacheParity>;
    __cabForcePwaRenderAudit?: boolean;
  }
}

export function initPwaRenderDiagnostics(): void {
  if (typeof window === "undefined" || !isPwaRenderAuditEnabled()) return;
  window.__cabPwaRenderAudit = exportPwaRenderAuditJson;
  window.__cabPwaRenderCacheParity = collectPwaRenderCacheParity;
}
