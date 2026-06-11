"use client";

import { useEffect, useRef } from "react";
import { normListSelectValue } from "@/lib/ui/list-select-utils";

export type UseSelectorScrollRestorationParams = {
  open: boolean;
  query: string;
  activeIndex: number;
  selectedValue: string;
  suggestions: readonly unknown[];
  getSuggestionKey: (item: unknown, index: number) => string;
  optionDomId: (index: number) => string;
  scrollToIndex?: (index: number) => void;
  onRestoreActiveIndex?: (index: number) => void;
};

const MAX_RETRY = 2;
const RETRY_MS = 80;

/**
 * Scroll restoration su reopen — no scroll on keystroke.
 */
export function useSelectorScrollRestoration({
  open,
  query,
  activeIndex,
  selectedValue,
  suggestions,
  getSuggestionKey,
  optionDomId,
  scrollToIndex,
  onRestoreActiveIndex,
}: UseSelectorScrollRestorationParams): void {
  const prevOpenRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open || wasOpen) return;
    if (query.trim()) {
      if (activeIndex >= 0) {
        scrollToSelected(activeIndex, optionDomId, scrollToIndex);
      }
      return;
    }

    const selectedIdx = suggestions.findIndex(
      (item, i) => getSuggestionKey(item, i) === selectedValue ||
        normListSelectValue(getSuggestionKey(item, i)) === normListSelectValue(selectedValue),
    );
    if (selectedIdx < 0) return;

    onRestoreActiveIndex?.(selectedIdx);

    retryCountRef.current = 0;
    const attempt = () => {
      const scrolled = scrollToSelected(selectedIdx, optionDomId, scrollToIndex);
      if (!scrolled && retryCountRef.current < MAX_RETRY) {
        retryCountRef.current += 1;
        window.setTimeout(attempt, RETRY_MS);
      }
    };
    requestAnimationFrame(attempt);
  }, [
    open,
    query,
    activeIndex,
    selectedValue,
    suggestions,
    getSuggestionKey,
    optionDomId,
    scrollToIndex,
    onRestoreActiveIndex,
  ]);
}

function scrollToSelected(
  index: number,
  optionDomId: (index: number) => string,
  scrollToIndex?: (index: number) => void,
): boolean {
  if (scrollToIndex) {
    scrollToIndex(index);
    return true;
  }
  const el = document.getElementById(optionDomId(index));
  if (!el) return false;
  el.scrollIntoView({ block: "center" });
  return true;
}
