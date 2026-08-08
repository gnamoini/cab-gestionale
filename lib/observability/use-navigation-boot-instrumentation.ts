"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";
import {
  beginNavigationBoot,
  exposeNavigationBootTimeline,
  markNavigationBoot,
} from "@/lib/observability/navigation-boot-timeline";
import {
  beginNavigationWaterfall,
  ensureNavigationHttpWaterfallInstrumentation,
  exposeNavigationWaterfall,
  markNavigationInteractive,
} from "@/lib/observability/navigation-http-waterfall";

/** Montare in AppShell — timeline + HTTP waterfall per navigazione client. */
export function useNavigationBootInstrumentation(shellReady: boolean): void {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const interactiveMarkedRef = useRef(false);

  useEffect(() => {
    if (!isNavigationBootDiagnosticsEnabled()) return;
    ensureNavigationHttpWaterfallInstrumentation();
  }, []);

  useEffect(() => {
    if (!isNavigationBootDiagnosticsEnabled()) return;
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    interactiveMarkedRef.current = false;
    beginNavigationBoot(pathname);
    beginNavigationWaterfall(pathname);
    markNavigationBoot("rsc_response_start", { pathname });
  }, [pathname]);

  useEffect(() => {
    if (!isNavigationBootDiagnosticsEnabled() || !shellReady) return;
    markNavigationBoot("shell_ready");
    markNavigationBoot("rsc_response_end", { pathname });
    exposeNavigationBootTimeline();
    exposeNavigationWaterfall();
  }, [shellReady, pathname]);

  useEffect(() => {
    if (!isNavigationBootDiagnosticsEnabled() || interactiveMarkedRef.current) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (interactiveMarkedRef.current) return;
        interactiveMarkedRef.current = true;
        markNavigationBoot("first_interactive", { pathname });
        markNavigationInteractive();
        exposeNavigationBootTimeline();
        exposeNavigationWaterfall();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
}
