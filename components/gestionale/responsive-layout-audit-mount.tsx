"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  emitResponsiveLayoutAuditWarnings,
  emitFlexSystemAuditWarnings,
  runResponsiveLayoutAudit,
  runFlexSystemAudit,
  FLEX_AUDIT_HYDRATION_DELAY_MS,
} from "@/lib/ui/responsive-layout-audit";
import { emitMobileModalAuditWarnings, runMobileModalAudit } from "@/lib/ui/mobile-modal-audit";

const DEBOUNCE_MS = 400;
/** Prima esecuzione post-hydration — evita false positive layout flex SSR/client. */
const HYDRATION_SETTLE_MS = FLEX_AUDIT_HYDRATION_DELAY_MS;

/**
 * Monta audit responsive DEV-only su navigazione e resize.
 * Non blocking; nessun effetto in produzione.
 */
export function ResponsiveLayoutAuditMount() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const result = runResponsiveLayoutAudit(pathname);
      emitResponsiveLayoutAuditWarnings(result);
      const flexResult = runFlexSystemAudit(pathname);
      emitFlexSystemAuditWarnings(flexResult);
      emitMobileModalAuditWarnings(runMobileModalAudit());
      // #region agent log
      fetch("http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bb7cdf" },
        body: JSON.stringify({
          sessionId: "bb7cdf",
          runId: "post-fix",
          hypothesisId: "H1-H3",
          location: "responsive-layout-audit-mount.tsx:run",
          message: "responsive audit summary",
          data: {
            pathname,
            findingCount: result.findings.length,
            viewportOverflowCount: result.findings.filter((f) => f.kind === "element-exceeds-viewport").length,
            pageOverflow: result.hasPageOverflow,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    }

    const hydrationTimer = setTimeout(schedule, HYDRATION_SETTLE_MS);

    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      clearTimeout(hydrationTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
