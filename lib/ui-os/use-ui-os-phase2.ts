"use client";

/**
 * Hook DEV-only — Phase 2 structural compare on opt-in pages.
 */

import { useEffect, useRef } from "react";
import { getPageUIMode } from "@/lib/ui-os/ui-os-engine";
import { buildPhase2CompareReport, emitPhase2CompareReport } from "@/lib/ui-os/ui-phase2-compare";
import { runUIOsValidationPipeline } from "@/lib/ui-os/ui-render-decision";
import type { UIPageMode, UIPageSchema } from "@/lib/ui-os/ui-schema";

const DEBOUNCE_MS = 450;

export function useUIOsPhase2(
  pageId: string,
  schema: UIPageSchema | undefined,
  mode: UIPageMode | undefined,
  deps: unknown[] = [],
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (process.env.NEXT_PUBLIC_CAB_UI_OS !== "1") return;
    if (getPageUIMode(pageId) !== "os") return;

    function run() {
      const main = document.querySelector(".cab-app-shell main");
      const decision = runUIOsValidationPipeline(pageId, schema, main, mode);
      const report = buildPhase2CompareReport(pageId, schema ?? {}, decision, main);
      emitPhase2CompareReport(report);
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
  }, [pageId, schema, mode, ...deps]);
}
