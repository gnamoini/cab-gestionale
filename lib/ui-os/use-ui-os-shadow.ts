"use client";

/**
 * Hook DEV-only — UI OS shadow report on pageId + deps.
 */

import { useEffect, useRef } from "react";
import { buildShadowReport, emitUIOsShadowReport } from "@/lib/ui-os/ui-os-engine";

const DEBOUNCE_MS = 450;

export function useUIOsShadow(pageId: string, deps: unknown[] = []): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const main = document.querySelector(".cab-app-shell main");
      const report = buildShadowReport(pageId, main);
      emitUIOsShadowReport(report);
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    }

    schedule();
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("resize", schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentional
  }, [pageId, ...deps]);
}
