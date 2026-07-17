/**
 * Global performance ceilings — SSOT for build/runtime governance v6.
 * Values calibrated from `.next/diagnostics/route-bundle-stats.json` post-v5 (2026-07-17).
 */

/** Shared app shell first-load JS (uncompressed bytes proxy via route-bundle-stats). */
export const GLOBAL_FIRST_LOAD_JS_KB = 1900;

/** Largest single shared vendor/framework chunk allowed (KB). */
export const GLOBAL_VENDOR_CHUNK_KB = 800;

/** Max React context provider nesting in app shell (static audit). */
export const MAX_PROVIDER_DEPTH = 12;

/** Max concurrent Supabase realtime channels (gestionale-realtime-config). */
export const MAX_REALTIME_CHANNELS = 8;

/** Default Web Vitals ceilings for Lighthouse cert gate. */
export const DEFAULT_WEB_VITALS_BUDGET = {
  lcpMs: 3500,
  inpMs: 300,
  cls: 0.15,
  ttfbMs: 1200,
  fcpMs: 2500,
} as const;

/** Regression diff thresholds (percent vs baseline). */
export const PERFORMANCE_REGRESSION_WARN_PCT = 10;
export const PERFORMANCE_REGRESSION_FAIL_PCT = 20;

/** ponytail: bundle mapping uses uncompressed JS from Next diagnostics — gzip on wire is lower. */
export const BUILD_BUDGET_TOLERANCE_PCT = 5;
