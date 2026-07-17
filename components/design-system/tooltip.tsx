"use client";

import {
  cloneElement,
  isValidElement,
  memo,
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
import {
  CAB_TOOLTIP_PORTAL_ATTR,
  getTooltipPortalContainer,
  tooltipPortalInlineStyle,
  type TooltipSide,
} from "@/lib/ui/tooltip-portal";
import { useTooltip } from "@/components/design-system/use-tooltip";
import { useMergedRefs } from "@/components/design-system/use-merged-refs";

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
  /** Distanza dal trigger (px). Default `TOOLTIP_GAP`. */
  sideOffset?: number;
};

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

export const Tooltip = memo(function Tooltip({
  content,
  children,
  side = "top",
  disabled = false,
  delayMs,
  showOnFocus = true,
  dismissOnPointerDown = true,
  multiline = false,
  sideOffset,
}: TooltipProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const displayContent = multiline
    ? content?.trim() || content
    : content?.trim()
      ? tooltipDisplayContent(content)
      : content;
  const { open, visible, resolvedSide, floatingStyles, setFloatingRef, setReferenceRef, triggerProps, hideImmediate } = useTooltip({
    content: displayContent,
    disabled,
    delayMs,
    side,
    sideOffset,
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

  const panel =
    open && displayContent?.trim() && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={setFloatingRef}
            role="tooltip"
            popover="manual"
            {...{ [CAB_TOOLTIP_PORTAL_ATTR]: "" }}
            className={`${multiline ? dsTooltipContentMultiline : dsTooltipContent} ${dsZTooltip} ${visible ? dsTooltipPortalVisible : dsTooltipPortalHidden}`}
            style={{ ...tooltipPortalInlineStyle(resolvedSide), ...floatingStyles }}
          >
            {displayContent}
          </div>,
          getTooltipPortalContainer(),
        )
      : null;

  return (
    <>
      {trigger}
      {panel}
    </>
  );
});
