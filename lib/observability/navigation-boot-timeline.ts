/**
 * Client navigation boot timeline — gated by NEXT_PUBLIC_BOOT_INVESTIGATION / PERF_DIAGNOSTICS.
 */

import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";

export type NavigationBootMarker =
  | "navigation_start"
  | "rsc_response_start"
  | "rsc_response_end"
  | "shell_ready"
  | "settings_owner_start"
  | "settings_owner_end"
  | "hydration_boundary_apply"
  | "first_route_render"
  | "first_interactive";

export type NavigationBootEvent = {
  marker: NavigationBootMarker;
  atMs: number;
  route?: string;
  meta?: Record<string, unknown>;
};

const MAX_EVENTS = 500;
const events: NavigationBootEvent[] = [];
let navigationStartMs = 0;
let currentRoute = "";

function enabled(): boolean {
  return isNavigationBootDiagnosticsEnabled();
}

export function markNavigationBoot(
  marker: NavigationBootMarker,
  meta?: Record<string, unknown>,
  route?: string,
): void {
  if (!enabled()) return;
  const atMs = performance.now();
  const routeLabel = route ?? currentRoute;
  events.push({ marker, atMs, route: routeLabel, meta });
  if (events.length > MAX_EVENTS) events.shift();
}

export function beginNavigationBoot(route: string): void {
  if (!enabled()) return;
  navigationStartMs = performance.now();
  currentRoute = route;
  markNavigationBoot("navigation_start", { href: route }, route);
}

export function getNavigationBootTimeline(): {
  navigationStartMs: number;
  currentRoute: string;
  events: readonly NavigationBootEvent[];
  phases: Record<string, number | undefined>;
} {
  const phases: Record<string, number | undefined> = {};
  const nav = events.find((e) => e.marker === "navigation_start");
  const shell = events.find((e) => e.marker === "shell_ready");
  const hydration = events.find((e) => e.marker === "hydration_boundary_apply");
  const interactive = events.find((e) => e.marker === "first_interactive");
  const rscEnd = events.find((e) => e.marker === "rsc_response_end");

  if (nav && shell) phases.nav_to_shell_ms = shell.atMs - nav.atMs;
  if (nav && interactive) phases.nav_to_interactive_ms = interactive.atMs - nav.atMs;
  if (rscEnd && hydration) phases.rsc_to_hydration_ms = hydration.atMs - rscEnd.atMs;
  if (hydration && interactive) phases.hydration_to_interactive_ms = interactive.atMs - hydration.atMs;

  return {
    navigationStartMs,
    currentRoute,
    events: [...events],
    phases,
  };
}

export function exposeNavigationBootTimeline(): void {
  if (typeof window === "undefined" || !enabled()) return;
  (window as Window & { __cabNavBootTimeline?: ReturnType<typeof getNavigationBootTimeline> }).__cabNavBootTimeline =
    getNavigationBootTimeline();
}
