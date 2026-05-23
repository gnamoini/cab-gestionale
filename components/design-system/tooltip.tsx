"use client";

import {
  cloneElement,
  isValidElement,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { dsTooltipContent } from "@/lib/ui/design-system";
import { tooltipFixedStyle, tooltipTransformOrigin, type TooltipSide } from "@/lib/ui/tooltip-portal";
import { useTooltip } from "@/components/design-system/use-tooltip";

export type TooltipProps = {
  /** Testo breve (1–3 parole). */
  content?: string;
  children: ReactElement;
  side?: TooltipSide;
  disabled?: boolean;
  delayMs?: number;
};

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

export function Tooltip({ content, children, side = "top", disabled = false, delayMs }: TooltipProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { open, visible, coords, triggerProps } = useTooltip({
    content,
    disabled,
    delayMs,
    side,
    anchorRef,
    contentRef,
  });

  if (!isValidElement(children)) {
    return children as ReactNode;
  }

  const child = children as ReactElement<Record<string, unknown>>;
  const childRef = (child as ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
  const childProps = child.props as Record<string, unknown>;

  const trigger = cloneElement(child, {
    ref: mergeRefs(childRef, anchorRef),
    title: undefined,
    onMouseEnter: mergeHandler(triggerProps.onMouseEnter, childProps.onMouseEnter as ((e: MouseEvent<HTMLElement>) => void) | undefined),
    onMouseLeave: mergeHandler(triggerProps.onMouseLeave, childProps.onMouseLeave as ((e: MouseEvent<HTMLElement>) => void) | undefined),
    onFocus: mergeHandler(triggerProps.onFocus, childProps.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined),
    onBlur: mergeHandler(triggerProps.onBlur, childProps.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined),
    onTouchStart: mergeHandler(triggerProps.onTouchStart, childProps.onTouchStart as ((e: TouchEvent<HTMLElement>) => void) | undefined),
    onTouchEnd: mergeHandler(triggerProps.onTouchEnd, childProps.onTouchEnd as ((e: TouchEvent<HTMLElement>) => void) | undefined),
    onTouchCancel: mergeHandler(triggerProps.onTouchCancel, childProps.onTouchCancel as ((e: TouchEvent<HTMLElement>) => void) | undefined),
  });

  const panel =
    open && content?.trim() && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={contentRef}
            role="tooltip"
            className={`${dsTooltipContent} ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            style={{
              ...tooltipFixedStyle(coords ?? { top: -9999, left: -9999, side }),
              transformOrigin: tooltipTransformOrigin(coords?.side ?? side),
            }}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {panel}
    </>
  );
}
