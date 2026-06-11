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
  CAB_FIELD_LABEL_ATTR,
  findGestionaleFieldContainer,
} from "@/lib/ui/mobile-modal-behavior";
import { subscribeGestionaleViewport } from "@/lib/ui/gestionale-viewport-orchestrator";
import {
  GLOBAL_DROPDOWN_MAX_HEIGHT,
  GLOBAL_DROPDOWN_MENU_GAP,
  GLOBAL_DROPDOWN_PORTAL_Z,
  globalDropdownPortalDetectOverflowOptions,
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
  /** True quando Floating UI ha calcolato x/y (evita flash in posizione errata). */
  isPositioned: boolean;
  /** Callback ref per il pannello portal — sincronizza `contentRef` e `refs.setFloating`. */
  floatingRef: (node: HTMLElement | null) => void;
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
  const portalOverflow = globalDropdownPortalDetectOverflowOptions();

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    update,
    isPositioned: floatingIsPositioned,
  } = useFloating({
    open,
    placement,
    strategy: "fixed",
    /** `top`/`left` invece di `transform` — evita conflitto con animazioni CSS sui menu portal. */
    transform: false,
    middleware: [
      offset(GLOBAL_DROPDOWN_MENU_GAP),
      flip({
        ...portalOverflow,
        fallbackPlacements: ["top-start", "bottom-start", "top-end", "bottom-end"],
      }),
      shift({ ...portalOverflow, crossAxis: true }),
      size({
        ...portalOverflow,
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

  const floatingRef = useCallback(
    (node: HTMLElement | null) => {
      if (contentRef) {
        (contentRef as { current: HTMLElement | null }).current = node;
      }
      refs.setFloating(node);
    },
    [contentRef, refs],
  );

  useLayoutEffect(() => {
    if (!open) {
      refs.setReference(null);
      refs.setFloating(null);
      return;
    }
    const anchor = anchorRef.current;
    if (anchor) refs.setReference(anchor);
  }, [open, anchorRef, refs, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = contentRef?.current;
    if (panel) refs.setFloating(panel);
  }, [open, contentRef, refs, floatingIsPositioned, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, update, ...repositionDeps]);

  useLayoutEffect(() => {
    if (!open) return;
    return subscribeGestionaleViewport(() => {
      update();
    });
  }, [open, update]);

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

  const isPositioned = open && floatingIsPositioned;

  const style: CSSProperties | undefined = useMemo(() => {
    if (!open) return undefined;
    return {
      ...floatingStyles,
      zIndex: GLOBAL_DROPDOWN_PORTAL_Z,
      visibility: isPositioned ? "visible" : "hidden",
      pointerEvents: isPositioned ? undefined : "none",
    };
  }, [open, floatingStyles, isPositioned]);

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
    isPositioned,
    floatingRef,
    scrollInside,
    placement: resolvedPlacement,
    placementOriginClass,
  };
}

function isPointerInsidePanel(e: PointerEvent, panel: HTMLElement): boolean {
  if (panel.contains(e.target as Node)) return true;
  const rect = panel.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return (
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  );
}

function isFieldCaptionElement(el: HTMLElement): boolean {
  if (el.tagName === "LABEL") return true;
  if (el.hasAttribute(CAB_FIELD_LABEL_ATTR)) return true;
  if (el.tagName === "P" || el.tagName === "SPAN") {
    const cls = typeof el.className === "string" ? el.className : "";
    return cls.includes("font-medium");
  }
  return false;
}

/** True se il pointer è sull'etichetta associata al controllo (evita dismiss+reopen flash). */
export function isPointerOnAssociatedFieldLabel(target: Node, anchor: HTMLElement): boolean {
  const wrappingLabel = anchor.closest("label");
  if (wrappingLabel?.contains(target)) return true;

  if (target instanceof Element) {
    const forLabel = target.closest("label[for]");
    if (forLabel) {
      const forId = forLabel.getAttribute("for");
      if (forId) {
        for (const el of anchor.querySelectorAll("[id]")) {
          if (el instanceof HTMLElement && el.id === forId) return true;
        }
      }
    }
  }

  const container = findGestionaleFieldContainer(anchor);
  if (container && target instanceof Element) {
    for (const ch of container.children) {
      if (!(ch instanceof HTMLElement)) continue;
      if (ch === anchor || anchor.contains(ch)) continue;
      if (!ch.contains(target) && ch !== target) continue;
      if (isFieldCaptionElement(ch)) return true;
    }
  }

  return false;
}

export type UseDropdownOutsideDismissOptions = {
  /** false: listener disattivato (es. pannello non ancora posizionato). */
  when?: boolean;
};

/** Chiude il menu se il tap/click è fuori da anchor e pannello portal. */
export function useDropdownOutsideDismiss(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  options?: UseDropdownOutsideDismissOptions,
): void {
  const when = options?.when ?? true;
  const onDismissStable = useCallback(() => onDismiss(), [onDismiss]);

  useLayoutEffect(() => {
    if (!open || !when) return;
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const anchor = anchorRef.current;
      if (anchor?.contains(target)) return;
      if (anchor && isPointerOnAssociatedFieldLabel(target, anchor)) return;
      const panel = panelRef.current;
      if (panel && isPointerInsidePanel(e, panel)) return;
      onDismissStable();
    }
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, when, anchorRef, panelRef, onDismissStable]);
}
