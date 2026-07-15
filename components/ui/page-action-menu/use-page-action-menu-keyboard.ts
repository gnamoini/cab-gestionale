"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

const MENUITEM_SELECTOR = '[role="menuitem"], a[role="menuitem"], a[data-testid^="page-action-menu-item"]';

function getMenuItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true",
  );
}

export function usePageActionMenuKeyboard({
  open,
  containerRef,
  onClose,
  activeIndex,
  setActiveIndex,
}: {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}): void {
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const focusItemAt = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const items = getMenuItems(container);
      if (items.length === 0) return;
      const clamped = ((index % items.length) + items.length) % items.length;
      setActiveIndex(clamped);
      items[clamped]?.focus({ preventScroll: true });
    },
    [containerRef, setActiveIndex],
  );

  useEffect(() => {
    if (!open) return;

    const id = window.requestAnimationFrame(() => {
      focusItemAt(0);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, focusItemAt]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const items = getMenuItems(container);
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusItemAt(activeIndexRef.current + 1);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        focusItemAt(activeIndexRef.current - 1);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        focusItemAt(0);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        focusItemAt(items.length - 1);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, containerRef, onClose, focusItemAt]);
}
