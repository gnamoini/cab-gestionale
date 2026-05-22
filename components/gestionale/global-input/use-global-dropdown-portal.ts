"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  computeGlobalDropdownCoords,
  globalDropdownFixedStyle,
  type GlobalDropdownCoords,
} from "@/lib/ui/global-dropdown-portal";

export function useGlobalDropdownPortal({
  open,
  anchorRef,
  contentRef,
  repositionDeps = [],
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  repositionDeps?: readonly unknown[];
}): { coords: GlobalDropdownCoords | null; style: CSSProperties | undefined } {
  const [coords, setCoords] = useState<GlobalDropdownCoords | null>(null);

  const updateCoords = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const contentHeight = contentRef?.current?.scrollHeight;
    setCoords((prev) => {
      const next = computeGlobalDropdownCoords(anchor, contentHeight);
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight &&
        prev.scrollInside === next.scrollInside
      ) {
        return prev;
      }
      return next;
    });
  }, [anchorRef, contentRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
  }, [open, updateCoords, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open || !contentRef?.current) return;
    updateCoords();
  }, [open, coords?.left, coords?.width, updateCoords, contentRef]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateCoords();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateCoords]);

  return {
    coords,
    style: coords ? globalDropdownFixedStyle(coords) : undefined,
  };
}

/** Chiude il menu se il click è fuori da anchor e pannello portal. */
export function useDropdownOutsideDismiss(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onDismiss();
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, anchorRef, panelRef, onDismiss]);
}
