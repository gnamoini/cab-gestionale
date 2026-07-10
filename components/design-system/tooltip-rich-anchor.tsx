"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTooltip } from "./use-tooltip";
import { dsZTooltip } from "@/lib/ui/design-system";
import { tooltipFixedStyle, tooltipTransformOrigin, type TooltipSide } from "@/lib/ui/tooltip-portal";

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

function mergeHandler<E>(
  ours: ((e: E) => void) | undefined,
  theirs: ((e: E) => void) | undefined,
): ((e: E) => void) | undefined {
  if (!ours) return theirs;
  if (!theirs) return ours;
  return (e) => {
    ours(e);
    theirs(e);
  };
}

/** Panel tooltip con contenuto React (lista/status) — stesso hook/portal del Tooltip testuale. */
export function TooltipRichAnchor({
  summary,
  panelClassName,
  children,
  side = "top",
  disabled = false,
  delayMs,
  showOnFocus = true,
  dismissOnPointerDown = true,
  panel,
}: {
  summary: string;
  panelClassName: string;
  children: ReactElement;
  side?: TooltipSide;
  disabled?: boolean;
  delayMs?: number;
  showOnFocus?: boolean;
  dismissOnPointerDown?: boolean;
  panel: ReactNode;
}) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { open, visible, coords, triggerProps, hideImmediate } = useTooltip({
    content: summary,
    disabled,
    delayMs,
    side,
    showOnFocus,
    dismissOnPointerDown,
    anchorRef,
    contentRef,
  });

  useEffect(() => () => hideImmediate(), [hideImmediate]);

  if (!isValidElement(children)) {
    return children as ReactNode;
  }

  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props as Record<string, unknown>;
  const childRef = childProps.ref as React.Ref<HTMLElement> | undefined;

  const trigger = cloneElement(child, {
    ref: mergeRefs(childRef, anchorRef),
    title: undefined,
    onMouseEnter: mergeHandler(triggerProps.onMouseEnter, childProps.onMouseEnter as ((e: MouseEvent<HTMLElement>) => void) | undefined),
    onMouseLeave: mergeHandler(triggerProps.onMouseLeave, childProps.onMouseLeave as ((e: MouseEvent<HTMLElement>) => void) | undefined),
    onFocus: mergeHandler(triggerProps.onFocus, childProps.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined),
    onBlur: mergeHandler(triggerProps.onBlur, childProps.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined),
    onPointerDown: mergeHandler(
      triggerProps.onPointerDown,
      childProps.onPointerDown as ((e: PointerEvent<HTMLElement>) => void) | undefined,
    ),
    onPointerUp: mergeHandler(
      triggerProps.onPointerUp,
      childProps.onPointerUp as ((e: PointerEvent<HTMLElement>) => void) | undefined,
    ),
    onPointerCancel: mergeHandler(
      triggerProps.onPointerCancel,
      childProps.onPointerCancel as ((e: PointerEvent<HTMLElement>) => void) | undefined,
    ),
    onTouchStart: mergeHandler(triggerProps.onTouchStart, childProps.onTouchStart as ((e: TouchEvent<HTMLElement>) => void) | undefined),
    onTouchEnd: mergeHandler(triggerProps.onTouchEnd, childProps.onTouchEnd as ((e: TouchEvent<HTMLElement>) => void) | undefined),
    onTouchCancel: mergeHandler(triggerProps.onTouchCancel, childProps.onTouchCancel as ((e: TouchEvent<HTMLElement>) => void) | undefined),
    onTouchMove: mergeHandler(triggerProps.onTouchMove, childProps.onTouchMove as ((e: TouchEvent<HTMLElement>) => void) | undefined),
  });

  const portal =
    open && summary.trim() && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={contentRef}
            role="tooltip"
            className={`${panelClassName} ${dsZTooltip} pointer-events-none ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            style={{
              ...tooltipFixedStyle(coords ?? { top: -9999, left: -9999, side }),
              transformOrigin: tooltipTransformOrigin(coords?.side ?? side),
              backgroundColor: "var(--cab-card)",
            }}
          >
            {panel}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {portal}
    </>
  );
}
