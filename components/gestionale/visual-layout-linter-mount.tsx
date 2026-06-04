"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  emitVisualLayoutLinterWarnings,
  runVisualLayoutLinterFromMain,
} from "@/lib/ui-visual-linter/visual-layout-linter";
import {
  emitUIAutonomyFixReport,
  runUIAutonomyFixEngineFromMain,
} from "@/lib/ui-autonomy-fix/ui-autonomy-engine";

const DEBOUNCE_MS = 400;

/**
 * Monta Visual Layout Linter DEV-only su navigazione e resize.
 * Non blocking; nessun effetto in produzione.
 */
export function VisualLayoutLinterMount() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const lint = runVisualLayoutLinterFromMain(pathname);
      emitVisualLayoutLinterWarnings(lint);
      const fixResult = runUIAutonomyFixEngineFromMain(pathname, lint);
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
  }, [pathname]);

  return null;
}
