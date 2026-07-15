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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  type TouchEvent,
} from "react";
import {
  hideTooltipPopover,
  showTooltipPopover,
  TOOLTIP_GAP,
  TOOLTIP_VIEWPORT_PAD,
  type TooltipSide,
} from "@/lib/ui/tooltip-portal";

const DEFAULT_SHOW_DELAY_MS = 150;
const HIDE_DELAY_MS = 100;
const TOUCH_HOLD_MS = 400;
/** Dopo un tap touch, ignora mouseenter sintetici (ghost events). */
const TOUCH_GHOST_MOUSE_MS = 500;

function sideToPlacement(side: TooltipSide): Placement {
  return side;
}

function placementToSide(placement: Placement): TooltipSide {
  if (placement.startsWith("bottom")) return "bottom";
  if (placement.startsWith("left")) return "left";
  if (placement.startsWith("right")) return "right";
  return "top";
}

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function useTooltip({
  content,
  disabled = false,
  delayMs = DEFAULT_SHOW_DELAY_MS,
  side = "top",
  sideOffset,
  showOnFocus = true,
  dismissOnPointerDown = true,
  contentRef,
}: {
  content?: string;
  disabled?: boolean;
  delayMs?: number;
  side?: TooltipSide;
  sideOffset?: number;
  /** Tooltip su focus tastiera (`:focus-visible`). Disabilitare per azioni che restano focalizzate al click. */
  showOnFocus?: boolean;
  /** Default `true`. Impostare `false` su handle drag (mousedown avvia il drag, non un click). */
  dismissOnPointerDown?: boolean;
  contentRef: RefObject<HTMLElement | null>;
}): {
  open: boolean;
  visible: boolean;
  resolvedSide: TooltipSide;
  floatingStyles: CSSProperties;
  setFloatingRef: (node: HTMLElement | null) => void;
  setReferenceRef: (node: HTMLElement | null) => void;
  hideImmediate: () => void;
  triggerProps: {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: (e: MouseEvent<HTMLElement>) => void;
    onFocus: (e: FocusEvent<HTMLElement>) => void;
    onBlur: (e: FocusEvent<HTMLElement>) => void;
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
    onTouchStart: (e: TouchEvent<HTMLElement>) => void;
    onTouchEnd: (e: TouchEvent<HTMLElement>) => void;
    onTouchCancel: (e: TouchEvent<HTMLElement>) => void;
    onTouchMove: (e: TouchEvent<HTMLElement>) => void;
  };
} {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchGhostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const pointerActivatedRef = useRef(false);
  const touchGhostRef = useRef(false);
  const coarsePointerRef = useRef(false);

  const canShow = Boolean(content?.trim()) && !disabled;

  const { refs, floatingStyles, isPositioned, placement } = useFloating({
    open,
    placement: sideToPlacement(side),
    strategy: "fixed",
    middleware: [
      offset(sideOffset ?? TOOLTIP_GAP),
      flip({
        padding: TOOLTIP_VIEWPORT_PAD,
        fallbackPlacements: ["top", "bottom", "left", "right"],
      }),
      shift({ padding: TOOLTIP_VIEWPORT_PAD, crossAxis: true }),
      size({
        padding: TOOLTIP_VIEWPORT_PAD,
        apply({ availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.max(0, Math.floor(availableWidth))}px`,
          });
        },
      }),
    ],
    whileElementsMounted: open ? autoUpdate : undefined,
  });

  const resolvedSide = placementToSide(placement);

  const setFloatingRef = useCallback(
    (node: HTMLElement | null) => {
      refs.setFloating(node);
      contentRef.current = node;
    },
    [contentRef, refs.setFloating],
  );

  const setReferenceRef = refs.setReference;

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearTouchTimer = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const clearTouchGhostTimer = useCallback(() => {
    if (touchGhostTimerRef.current) {
      clearTimeout(touchGhostTimerRef.current);
      touchGhostTimerRef.current = null;
    }
  }, []);

  const armTouchGhostMouseGuard = useCallback(() => {
    touchGhostRef.current = true;
    clearTouchGhostTimer();
    touchGhostTimerRef.current = setTimeout(() => {
      touchGhostRef.current = false;
      touchGhostTimerRef.current = null;
    }, TOUCH_GHOST_MOUSE_MS);
  }, [clearTouchGhostTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, HIDE_DELAY_MS);
    }, 0);
  }, [clearHideTimer]);

  const show = useCallback(() => {
    if (!canShow) return;
    activeRef.current = true;
    clearHideTimer();
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      setVisible(false);
      setOpen(true);
    }, delayMs);
  }, [canShow, clearHideTimer, clearShowTimer, delayMs]);

  const hide = useCallback(() => {
    activeRef.current = false;
    clearShowTimer();
    clearTouchTimer();
    scheduleHide();
  }, [clearShowTimer, clearTouchTimer, scheduleHide]);

  const hideImmediate = useCallback(() => {
    activeRef.current = false;
    clearShowTimer();
    clearTouchTimer();
    clearHideTimer();
    hideTooltipPopover(contentRef.current);
    setVisible(false);
    setOpen(false);
  }, [clearShowTimer, clearTouchTimer, clearHideTimer, contentRef]);

  useEffect(() => {
    coarsePointerRef.current = isCoarsePointerDevice();
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const onChange = () => {
      coarsePointerRef.current = mq.matches;
      if (mq.matches) hideImmediate();
    };
    mq.addEventListener?.("change", onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
    };
  }, [hideImmediate]);

  useLayoutEffect(() => {
    if (!open) {
      hideTooltipPopover(contentRef.current);
      setVisible((v) => (v ? false : v));
      return;
    }
    if (isPositioned && activeRef.current) {
      setVisible((v) => (v ? v : true));
      showTooltipPopover(contentRef.current);
    }
  }, [open, isPositioned, content, contentRef]);

  useEffect(() => {
    if (!open) return;
    const onScrollHide = () => hideImmediate();
    window.addEventListener("scroll", onScrollHide, true);
    return () => {
      window.removeEventListener("scroll", onScrollHide, true);
    };
  }, [open, hideImmediate]);

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
      clearTouchTimer();
      clearTouchGhostTimer();
    };
  }, [clearShowTimer, clearHideTimer, clearTouchTimer, clearTouchGhostTimer]);

  const onMouseEnter = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      if (coarsePointerRef.current) return;
      if (touchGhostRef.current) return;
      show();
    },
    [show],
  );

  const onMouseLeave = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      if (coarsePointerRef.current) return;
      pointerActivatedRef.current = false;
      hide();
    },
    [hide],
  );

  const onFocus = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (!showOnFocus || pointerActivatedRef.current) return;
      if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
        show();
      }
    },
    [show, showOnFocus],
  );

  const onBlur = useCallback(
    (_e: FocusEvent<HTMLElement>) => {
      pointerActivatedRef.current = false;
      hide();
    },
    [hide],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" || e.pointerType === "touch" || e.pointerType === "pen") {
        pointerActivatedRef.current = true;
      }
      if (dismissOnPointerDown) hideImmediate();
    },
    [dismissOnPointerDown, hideImmediate],
  );

  const onPointerUp = useCallback(() => {
    // Il flag pointer resta fino a mouse leave / blur per non riaprire su :focus-visible da click.
  }, []);

  const onPointerCancel = useCallback(() => {
    pointerActivatedRef.current = false;
    hideImmediate();
  }, [hideImmediate]);

  const onTouchStart = useCallback(
    (_e: TouchEvent<HTMLElement>) => {
      if (!canShow) return;
      clearTouchTimer();
      touchTimerRef.current = setTimeout(() => {
        show();
      }, TOUCH_HOLD_MS);
    },
    [canShow, clearTouchTimer, show],
  );

  const onTouchEnd = useCallback(
    (_e: TouchEvent<HTMLElement>) => {
      clearTouchTimer();
      armTouchGhostMouseGuard();
      hide();
    },
    [armTouchGhostMouseGuard, clearTouchTimer, hide],
  );

  const onTouchCancel = useCallback(
    (_e: TouchEvent<HTMLElement>) => {
      clearTouchTimer();
      armTouchGhostMouseGuard();
      hide();
    },
    [armTouchGhostMouseGuard, clearTouchTimer, hide],
  );

  const onTouchMove = useCallback(
    (_e: TouchEvent<HTMLElement>) => {
      clearTouchTimer();
    },
    [clearTouchTimer],
  );

  return {
    open,
    visible,
    resolvedSide,
    floatingStyles,
    setFloatingRef,
    setReferenceRef,
    hideImmediate,
    triggerProps: {
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      onTouchMove,
    },
  };
}
