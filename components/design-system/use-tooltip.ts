"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  type TouchEvent,
} from "react";
import {
  computeTooltipCoords,
  type TooltipCoords,
  type TooltipSide,
} from "@/lib/ui/tooltip-portal";

const DEFAULT_SHOW_DELAY_MS = 150;
const HIDE_DELAY_MS = 100;
const TOUCH_HOLD_MS = 400;
/** Dopo un tap touch, ignora mouseenter sintetici (ghost events). */
const TOUCH_GHOST_MOUSE_MS = 500;

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function useTooltip({
  content,
  disabled = false,
  delayMs = DEFAULT_SHOW_DELAY_MS,
  side = "top",
  showOnFocus = true,
  anchorRef,
  contentRef,
}: {
  content?: string;
  disabled?: boolean;
  delayMs?: number;
  side?: TooltipSide;
  /** Tooltip su focus tastiera (`:focus-visible`). Disabilitare per azioni che restano focalizzate al click. */
  showOnFocus?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
}): {
  open: boolean;
  visible: boolean;
  coords: TooltipCoords | null;
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
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchGhostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const pointerActivatedRef = useRef(false);
  const touchGhostRef = useRef(false);
  const coarsePointerRef = useRef(false);

  const canShow = Boolean(content?.trim()) && !disabled;

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

  const updateCoords = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = contentRef.current;
    if (!anchor || !panel) return;
    setCoords(computeTooltipCoords(anchor, panel, side));
  }, [anchorRef, contentRef, side]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = setTimeout(() => {
        setOpen(false);
        setCoords(null);
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
      setOpen(true);
      requestAnimationFrame(() => setVisible(true));
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
    setVisible(false);
    setOpen(false);
    setCoords(null);
  }, [clearShowTimer, clearTouchTimer, clearHideTimer]);

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
    if (!open) return;
    updateCoords();
  }, [open, content, updateCoords]);

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
      hideImmediate();
    },
    [hideImmediate],
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
    coords,
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
