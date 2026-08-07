"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { operationFromRoute, setObsContext } from "@/lib/observability/context";
import { recordFatal } from "@/lib/observability/fatal-aggregator";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { mountLongTaskObserver } from "@/lib/observability/long-task-observer";

/** Sync shell observability — hydration capture, context, base error reporting. */
export function ObservabilityProviderLite({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const routeRef = useRef(pathname);
  routeRef.current = pathname;

  useEffect(() => {
    setObsContext({
      route: pathname,
      operation: operationFromRoute(pathname),
      userId: user?.id?.trim() || "anon",
    });
  }, [pathname, user?.id]);

  useEffect(() => {
    const bootAt = performance.now();
    trackRuntimeEvent(RuntimeEvents.hydrationDuration, {
      durationMs: Math.round(bootAt),
      route: pathname,
    });
    const handle = mountLongTaskObserver(() => routeRef.current);
    return () => handle?.disconnect();
  }, []);

  useEffect(() => {
    function onWindowError(event: ErrorEvent): void {
      const msg = event.message ?? "";
      if (!/hydration/i.test(msg)) return;
      recordFatal("hydration.mismatch", { message: msg, route: pathname });
      trackRuntimeEvent(RuntimeEvents.runtimeHydrationMismatch, {
        message: msg.slice(0, 200),
        route: pathname,
      });
    }
    window.addEventListener("error", onWindowError);
    return () => window.removeEventListener("error", onWindowError);
  }, [pathname]);

  return children;
}
