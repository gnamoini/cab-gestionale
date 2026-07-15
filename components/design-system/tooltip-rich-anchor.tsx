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
import { useMergedRefs } from "./use-merged-refs";
import { dsTooltipPortalHidden, dsTooltipPortalVisible, dsZTooltip } from "@/lib/ui/design-system";
import {
  CAB_TOOLTIP_PORTAL_ATTR,
  getTooltipPortalContainer,
  tooltipPortalInlineStyle,
  type TooltipSide,
} from "@/lib/ui/tooltip-portal";

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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { open, visible, resolvedSide, floatingStyles, setFloatingRef, setReferenceRef, triggerProps, hideImmediate } = useTooltip({
    content: summary,
    disabled,
    delayMs,
    side,
    showOnFocus,
    dismissOnPointerDown,
    contentRef,
  });

  useEffect(() => () => hideImmediate(), [hideImmediate]);

  const childRef = isValidElement(children)
    ? ((children as ReactElement<Record<string, unknown>>).props.ref as React.Ref<HTMLElement> | undefined)
    : undefined;
  const mergedReferenceRef = useMergedRefs(childRef, setReferenceRef);

  if (!isValidElement(children)) {
    return children as ReactNode;
  }

  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props as Record<string, unknown>;

  const trigger = cloneElement(child, {
    ref: mergedReferenceRef,
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
            ref={setFloatingRef}
            role="tooltip"
            popover="manual"
            {...{ [CAB_TOOLTIP_PORTAL_ATTR]: "" }}
            className={`${panelClassName} ${dsZTooltip} pointer-events-none ${visible ? dsTooltipPortalVisible : dsTooltipPortalHidden}`}
            style={{ ...tooltipPortalInlineStyle(resolvedSide), ...floatingStyles }}
          >
            {panel}
          </div>,
          getTooltipPortalContainer(),
        )
      : null;

  return (
    <>
      {trigger}
      {portal}
    </>
  );
}
