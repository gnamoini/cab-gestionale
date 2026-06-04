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
