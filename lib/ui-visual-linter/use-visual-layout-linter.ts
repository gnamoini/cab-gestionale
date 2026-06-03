"use client";

/**
 * Hook DEV-only — re-run visual layout linter su pageId + deps.
 * Zero side-effects sul render; nessun state React.
 */

import { useEffect, useRef } from "react";
import {
  emitVisualLayoutLinterWarnings,
  runVisualLayoutLinterFromMain,
  runVisualLayoutLinterOnModal,
} from "@/lib/ui-visual-linter/visual-layout-linter";

const DEBOUNCE_MS = 400;

export function useVisualLayoutLinter(pageId: string, deps: unknown[] = []): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function run() {
      const result = runVisualLayoutLinterFromMain(pageId);
      emitVisualLayoutLinterWarnings(result);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentional for view-state re-lint
  }, [pageId, ...deps]);
}

/** Lint modale aperta (DEV only) — non altera API Modal. */
export function useDevModalLayoutLint(open: boolean, modalId: string): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !open) return;

    function run() {
      const dialog = document.querySelector(
        `[role='dialog'][aria-modal='true'], [data-cab-modal-root]`,
      );
      const result = runVisualLayoutLinterOnModal(modalId, dialog);
      emitVisualLayoutLinterWarnings(result);
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    }

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, modalId]);
}
