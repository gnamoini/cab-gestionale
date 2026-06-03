"use client";

/**
 * Hook DEV-only — auto-fix layout dopo Visual Layout Linter.
 */

import { useEffect, useRef } from "react";
import { emitVisualLayoutLinterWarnings, runVisualLayoutLinterFromMain } from "@/lib/ui-visual-linter/visual-layout-linter";
import {
  emitUIAutonomyFixReport,
  runUIAutonomyFixEngineFromMain,
} from "@/lib/ui-autonomy-fix/ui-autonomy-engine";

const DEBOUNCE_MS = 450;

export function useUIAutonomyFixEngine(pageId: string, deps: unknown[] = []): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const lint = runVisualLayoutLinterFromMain(pageId);
      emitVisualLayoutLinterWarnings(lint);
      const fixResult = runUIAutonomyFixEngineFromMain(pageId, lint);
      emitUIAutonomyFixReport(fixResult);
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
