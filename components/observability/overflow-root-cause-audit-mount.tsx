"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { FLEX_AUDIT_HYDRATION_DELAY_MS } from "@/lib/ui/responsive-layout-audit";
import {
  emitOverflowAuditLogs,
  runOverflowRootCauseAudit,
} from "@/lib/observability/overflow-root-cause-audit";

const DEBOUNCE_MS = 400;
const HYDRATION_SETTLE_MS = FLEX_AUDIT_HYDRATION_DELAY_MS;

function isOverflowAuditEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT === "1"
  );
}

/**
 * Monta overflow root-cause audit DEV-only su navigazione, resize e mutazioni main.
 */
export function OverflowRootCauseAuditMount() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOverflowAuditEnabled()) return;

    function run() {
      const result = runOverflowRootCauseAudit(pathname);
      emitOverflowAuditLogs(result);
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    }

    const hydrationTimer = setTimeout(schedule, HYDRATION_SETTLE_MS);

    window.addEventListener("resize", schedule, { passive: true });

    const main = document.querySelector(".cab-app-shell main");
    let observer: MutationObserver | null = null;
    if (main) {
      observer = new MutationObserver(schedule);
      observer.observe(main, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      clearTimeout(hydrationTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
