"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Focus iniziale + trap Tab nel dialog. ponytail: no libreria esterna.
 */
export function useDialogFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocusSelector = 'button[aria-label="Chiudi"]',
): void {
  const initialFocusDoneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      initialFocusDoneRef.current = false;
      return;
    }

    const id = window.requestAnimationFrame(() => {
      if (initialFocusDoneRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const preferred = container.querySelector(initialFocusSelector);
      if (preferred instanceof HTMLElement) {
        preferred.focus({ preventScroll: true });
        initialFocusDoneRef.current = true;
        return;
      }
      const focusable = getFocusableElements(container);
      focusable[0]?.focus({ preventScroll: true });
      initialFocusDoneRef.current = true;
    });

    return () => window.cancelAnimationFrame(id);
  }, [active, containerRef, initialFocusSelector]);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (activeEl === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}
