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
import { dsTooltipContent, dsTooltipContentMultiline, dsTooltipPortalHidden, dsTooltipPortalVisible, dsZTooltip } from "@/lib/ui/design-system";
import { tooltipFixedStyle, tooltipTransformOrigin, type TooltipSide } from "@/lib/ui/tooltip-portal";
import { useTooltip } from "@/components/design-system/use-tooltip";

/** Prima lettera maiuscola per etichette tooltip (accessibilità e UI coerente). */
function tooltipDisplayContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;
  const first = trimmed.charAt(0);
  if (first >= "a" && first <= "z") {
    return first.toLocaleUpperCase("it-IT") + trimmed.slice(1);
  }
  return trimmed;
}

export type TooltipProps = {
  /** Testo breve (1–3 parole). */
  content?: string;
  children: ReactElement;
  side?: TooltipSide;
  disabled?: boolean;
  delayMs?: number;
  /** Default `true`. Impostare `false` su controlli che restano focalizzati dopo il click (es. toggle tema). */
  showOnFocus?: boolean;
  /** Default `true`. Impostare `false` su handle drag (mousedown avvia il trascinamento). */
  dismissOnPointerDown?: boolean;
  /** Supporta `\n` nel contenuto (es. tooltip celle timesheet). */
  multiline?: boolean;
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

export function Tooltip({
  content,
  children,
  side = "top",
  disabled = false,
  delayMs,
  showOnFocus = true,
  dismissOnPointerDown = true,
  multiline = false,
}: TooltipProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const displayContent = multiline
    ? content?.trim() || content
    : content?.trim()
      ? tooltipDisplayContent(content)
      : content;
  const { open, visible, coords, triggerProps, hideImmediate } = useTooltip({
    content: displayContent,
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

  const panel =
    open && displayContent?.trim() && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={contentRef}
            role="tooltip"
            className={`${multiline ? dsTooltipContentMultiline : dsTooltipContent} ${dsZTooltip} ${visible ? dsTooltipPortalVisible : dsTooltipPortalHidden}`}
            style={{
              ...tooltipFixedStyle(coords ?? { top: -9999, left: -9999, side }),
              transformOrigin: tooltipTransformOrigin(coords?.side ?? side),
              backgroundColor: "var(--cab-card)",
              opacity: 1,
            }}
          >
            {displayContent}
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
