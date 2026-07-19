"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { operationFromRoute, setObsContext } from "@/lib/observability/context";
import { recordFatal } from "@/lib/observability/fatal-aggregator";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

/** Sync shell observability — hydration capture, context, base error reporting. */
export function ObservabilityProviderLite({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();

  useEffect(() => {
    setObsContext({
      route: pathname,
      operation: operationFromRoute(pathname),
      userId: user?.id?.trim() || "anon",
    });
  }, [pathname, user?.id]);

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
