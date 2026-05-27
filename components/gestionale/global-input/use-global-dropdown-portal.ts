"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  GLOBAL_DROPDOWN_MAX_HEIGHT,
  GLOBAL_DROPDOWN_MENU_GAP,
  GLOBAL_DROPDOWN_PORTAL_Z,
  GLOBAL_DROPDOWN_VIEWPORT_PAD,
  globalDropdownPlacementOriginClass,
  type GlobalDropdownCoords,
  type GlobalDropdownPlacement,
} from "@/lib/ui/global-dropdown-portal";

export type UseGlobalDropdownPortalOptions = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  repositionDeps?: readonly unknown[];
  placement?: Placement;
  /** Larghezza pannello = anchor (default true). */
  matchAnchorWidth?: boolean;
  /** Larghezza fissa (es. calendario). */
  panelWidth?: number;
  maxHeight?: number;
};

export type UseGlobalDropdownPortalResult = {
  coords: GlobalDropdownCoords | null;
  style: CSSProperties | undefined;
  scrollInside: boolean;
  placement: Placement;
  placementOriginClass: string;
};

function placementAxis(placement: Placement): GlobalDropdownPlacement {
  return placement.startsWith("top") ? "top" : "bottom";
}

export function useGlobalDropdownPortal({
  open,
  anchorRef,
  contentRef,
  repositionDeps = [],
  placement = "bottom-start",
  matchAnchorWidth = true,
  panelWidth,
  maxHeight = GLOBAL_DROPDOWN_MAX_HEIGHT,
}: UseGlobalDropdownPortalOptions): UseGlobalDropdownPortalResult {
  const [scrollInside, setScrollInside] = useState(false);

  const { refs, floatingStyles, placement: resolvedPlacement, update } = useFloating({
    open,
    placement,
    strategy: "fixed",
    middleware: [
      offset(GLOBAL_DROPDOWN_MENU_GAP),
      flip({
        padding: GLOBAL_DROPDOWN_VIEWPORT_PAD,
        fallbackPlacements: ["top-start", "bottom-start", "top-end", "bottom-end"],
      }),
      shift({ padding: GLOBAL_DROPDOWN_VIEWPORT_PAD, crossAxis: true }),
      size({
        padding: GLOBAL_DROPDOWN_VIEWPORT_PAD,
        apply({ availableHeight, availableWidth, rects, elements }) {
          const capped = Math.min(maxHeight, Math.max(80, availableHeight));
          const width =
            panelWidth != null
              ? Math.min(panelWidth, availableWidth)
              : matchAnchorWidth
                ? rects.reference.width
                : undefined;
          Object.assign(elements.floating.style, {
            maxHeight: `${capped}px`,
            ...(width != null ? { width: `${width}px` } : { maxWidth: `${availableWidth}px` }),
          });
        },
      }),
    ],
    whileElementsMounted: open
      ? (reference, floating, updateFn) =>
          autoUpdate(reference, floating, updateFn, {
            ancestorScroll: true,
            ancestorResize: true,
            elementResize: true,
            layoutShift: true,
          })
      : undefined,
  });

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (anchor) refs.setReference(anchor);
  }, [open, anchorRef, refs, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = contentRef?.current;
    if (panel) refs.setFloating(panel);
  }, [open, contentRef, refs, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, update, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open || !contentRef?.current) {
      setScrollInside(false);
      return;
    }
    const el = contentRef.current;
    const measure = () => {
      setScrollInside(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [open, contentRef, floatingStyles, ...repositionDeps]);

  const style: CSSProperties | undefined = useMemo(() => {
    if (!open) return undefined;
    return {
      ...floatingStyles,
      zIndex: GLOBAL_DROPDOWN_PORTAL_Z,
    };
  }, [open, floatingStyles]);

  const coords: GlobalDropdownCoords | null = useMemo(() => {
    if (!open || !anchorRef.current) return null;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const floatingRect = contentRef?.current?.getBoundingClientRect();
    const width = panelWidth ?? (matchAnchorWidth ? anchorRect.width : floatingRect?.width ?? anchorRect.width);
    return {
      top: floatingRect?.top ?? anchorRect.bottom + GLOBAL_DROPDOWN_MENU_GAP,
      left: floatingRect?.left ?? anchorRect.left,
      width,
      maxHeight,
      scrollInside,
      placement: placementAxis(resolvedPlacement),
    };
  }, [
    open,
    anchorRef,
    contentRef,
    panelWidth,
    matchAnchorWidth,
    maxHeight,
    scrollInside,
    resolvedPlacement,
  ]);

  const placementOriginClass = globalDropdownPlacementOriginClass(resolvedPlacement);

  return {
    coords,
    style,
    scrollInside,
    placement: resolvedPlacement,
    placementOriginClass,
  };
}

/** Chiude il menu se il tap/click è fuori da anchor e pannello portal. */
export function useDropdownOutsideDismiss(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  const onDismissStable = useCallback(() => onDismiss(), [onDismiss]);

  useLayoutEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onDismissStable();
    }
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, anchorRef, panelRef, onDismissStable]);
}
