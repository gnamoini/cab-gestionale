"use client";

import { useCallback } from "react";

export type UseSelectorListboxKeyboardParams = {
  open: boolean;
  totalNavigableOptions: number;
  activeIndex: number;
  setOpen: (open: boolean) => void;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  onEscape: () => void;
  onEnter: () => void;
  onTabCycle?: (shiftKey: boolean) => void;
};

export function useSelectorListboxKeyboard({
  open,
  totalNavigableOptions,
  activeIndex,
  setOpen,
  setActiveIndex,
  onEscape,
  onEnter,
  onTabCycle,
}: UseSelectorListboxKeyboardParams) {
  void activeIndex;
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (open) e.preventDefault();
        onEscape();
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setOpen(true);
        setActiveIndex(totalNavigableOptions > 0 ? 0 : -1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown" && totalNavigableOptions > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (i + 1) % totalNavigableOptions);
        return;
      }
      if (e.key === "ArrowUp" && totalNavigableOptions > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (i <= 0 ? totalNavigableOptions - 1 : i - 1));
        return;
      }
      if (e.key === "Tab" && totalNavigableOptions > 0) {
        e.preventDefault();
        setOpen(true);
        if (onTabCycle) {
          onTabCycle(e.shiftKey);
        } else if (e.shiftKey) {
          setActiveIndex((i) => (i <= 0 ? totalNavigableOptions - 1 : i - 1));
        } else {
          setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % totalNavigableOptions));
        }
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      onEnter();
    },
    [
      open,
      totalNavigableOptions,
      setOpen,
      setActiveIndex,
      onEscape,
      onEnter,
      onTabCycle,
    ],
  );
}
