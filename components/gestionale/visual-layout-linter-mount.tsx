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
      // #region agent log
      fetch("http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bb7cdf" },
        body: JSON.stringify({
          sessionId: "bb7cdf",
          runId: "post-fix",
          hypothesisId: "H4-H5",
          location: "visual-layout-linter-mount.tsx:run",
          message: "layout linter summary",
          data: {
            pathname,
            issueCount: lint.issues.length,
            toolbarIssues: lint.issues.filter((i) => i.category === "toolbar").map((i) => i.rule),
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

    schedule();

    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
