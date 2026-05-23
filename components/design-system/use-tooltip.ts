"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
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

export function useTooltip({
  content,
  disabled = false,
  delayMs = DEFAULT_SHOW_DELAY_MS,
  side = "top",
  anchorRef,
  contentRef,
}: {
  content?: string;
  disabled?: boolean;
  delayMs?: number;
  side?: TooltipSide;
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
    onTouchStart: (e: TouchEvent<HTMLElement>) => void;
    onTouchEnd: (e: TouchEvent<HTMLElement>) => void;
    onTouchCancel: (e: TouchEvent<HTMLElement>) => void;
  };
} {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

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
    };
  }, [clearShowTimer, clearHideTimer, clearTouchTimer]);

  const onMouseEnter = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      show();
    },
    [show],
  );

  const onMouseLeave = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      hide();
    },
    [hide],
  );

  const onFocus = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
        show();
      }
    },
    [show],
  );

  const onBlur = useCallback(
    (_e: FocusEvent<HTMLElement>) => {
      hide();
    },
    [hide],
  );

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
      hide();
    },
    [clearTouchTimer, hide],
  );

  const onTouchCancel = useCallback(
    (_e: TouchEvent<HTMLElement>) => {
      clearTouchTimer();
      hide();
    },
    [clearTouchTimer, hide],
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
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
    },
  };
}
