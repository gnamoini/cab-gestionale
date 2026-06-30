"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  exportInvestigationReport,
  isBootInvestigationEnabled,
  logBoot,
  trackRedirect,
} from "@/lib/observability/boot-investigation";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";

/**
 * Root investigation mount — pathname transitions + pending query helper.
 * Dev-only when NEXT_PUBLIC_BOOT_INVESTIGATION=1.
 */
export function BootInvestigationMount() {
  const pathname = usePathname() ?? "/";
  const prevPathRef = useRef<string | null>(null);
  const client = useQueryClient();

  useBootInvestigationMount("BootInvestigationMount");

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    logBoot("BOOT", "client_hydrated", {
      pathname,
      innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : null,
    });
  }, []);

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    const prev = prevPathRef.current;
    if (prev != null && prev !== pathname) {
      trackRedirect(prev, pathname, "pathname_change", "router");
      logBoot("RENDER", "router", { from: prev, to: pathname }, `${prev}→${pathname}`);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;

    window.__cabPendingQueries = (minPendingMs = 10_000) => {
      const now = Date.now();
      return client
        .getQueryCache()
        .getAll()
        .filter((q) => {
          if (q.state.fetchStatus !== "fetching") return false;
          const started = q.state.fetchMeta?.fetchMore?.direction
            ? now
            : (q.state.dataUpdatedAt || q.state.errorUpdatedAt || now);
          return now - started >= minPendingMs || q.state.fetchStatus === "fetching";
        })
        .map((q) => ({
          queryKey: q.queryKey,
          status: q.state.status,
          fetchStatus: q.state.fetchStatus,
          dataUpdatedAt: q.state.dataUpdatedAt,
          errorUpdatedAt: q.state.errorUpdatedAt,
          pendingMs: now - (q.state.dataUpdatedAt || 0),
        }));
    };
  }, [client]);

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    (window as Window & { __cabBootInvestigation?: typeof exportInvestigationReport }).__cabBootInvestigation =
      exportInvestigationReport;
  }, []);

  return null;
}
