"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type ForwardedRef,
  type TextareaHTMLAttributes,
} from "react";
import { gestionaleMultilineEnterProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { registerGestionaleTextareaViewportSync } from "@/lib/ui/gestionale-textarea-viewport";
import {
  scrollGestionaleFieldIntoView,
  shouldSkipRedundantGestionaleFocusScroll,
} from "@/lib/ui/mobile-modal-behavior";
import {
  dsTextarea,
  gestionaleTextareaMaxHeightDefault,
  type GestionaleTextareaSize,
} from "@/lib/ui/design-system";

export type { GestionaleTextareaSize };

const SIZE_MIN_HEIGHT: Record<GestionaleTextareaSize, string> = {
  sm: "3.5rem",
  md: "5.5rem",
  lg: "7rem",
};

export type GestionaleTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: GestionaleTextareaSize;
  /** Crescita verticale automatica (default: true). */
  autoGrow?: boolean;
  /** Tetto auto-grow prima dello scroll interno; default SSOT se autoGrow. */
  maxHeight?: string;
};

function mergeClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function minHeightPx(size: GestionaleTextareaSize): number {
  return parseFloat(SIZE_MIN_HEIGHT[size]) * 16;
}

function resolvedMinHeightPx(el: HTMLTextAreaElement, size: GestionaleTextareaSize): number {
  const computed = parseFloat(getComputedStyle(el).minHeight);
  if (Number.isFinite(computed) && computed > 0) return computed;
  return minHeightPx(size);
}

/** Misura e applica altezza auto-grow (pattern iOS-safe: overflow hidden fino al tetto, poi scroll). */
function syncTextareaAutoGrowHeight(
  el: HTMLTextAreaElement,
  size: GestionaleTextareaSize,
  maxHeightCss: string | undefined,
): boolean {
  const prevHeight = el.style.height;
  const prevScrollable = el.getAttribute("data-cab-textarea-scrollable") === "true";

  el.style.overflowY = "hidden";
  el.style.height = "auto";
  const minPx = resolvedMinHeightPx(el, size);
  const contentHeight = el.scrollHeight;
  let next = Math.max(minPx, contentHeight);

  let maxPx = Number.POSITIVE_INFINITY;
  if (maxHeightCss) {
    el.style.maxHeight = maxHeightCss;
    const computedMax = parseFloat(getComputedStyle(el).maxHeight);
    if (Number.isFinite(computedMax) && computedMax > 0) {
      maxPx = computedMax;
      next = Math.min(next, maxPx);
    }
  }

  const scrollable = Number.isFinite(maxPx) && contentHeight > maxPx;
  const nextPx = `${next}px`;
  el.style.height = nextPx;
  if (scrollable) {
    el.setAttribute("data-cab-textarea-scrollable", "true");
  } else {
    el.removeAttribute("data-cab-textarea-scrollable");
  }
  /** Misura con hidden; poi delega overflow a CSS (`data-cab-textarea-scrollable`). */
  el.style.overflowY = "";

  return prevHeight !== nextPx || prevScrollable !== scrollable;
}

function GestionaleTextareaInner(
  {
    value,
    onChange,
    id,
    disabled,
    readOnly,
    rows,
    maxLength,
    placeholder,
    size = "md",
    autoGrow = true,
    maxHeight: maxHeightProp,
    className = "",
    style,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    ...rest
  }: GestionaleTextareaProps,
  forwardedRef: ForwardedRef<HTMLTextAreaElement>,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const resolvedMaxHeight = autoGrow ? (maxHeightProp ?? gestionaleTextareaMaxHeightDefault) : undefined;

  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  const scheduleFocusRescroll = () => {
    const el = innerRef.current;
    if (!el || document.activeElement !== el) return;
    if (shouldSkipRedundantGestionaleFocusScroll(el, "textarea-grow")) return;
    if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (shouldSkipRedundantGestionaleFocusScroll(el, "textarea-grow")) return;
      scrollGestionaleFieldIntoView(el, { behavior: "auto" });
    });
  };

  useLayoutEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;
    const grew = syncTextareaAutoGrowHeight(el, size, resolvedMaxHeight);
    if (grew) scheduleFocusRescroll();
  }, [autoGrow, value, readOnly, size, resolvedMaxHeight]);

  useEffect(() => {
    if (!autoGrow) return;
    return registerGestionaleTextareaViewportSync(() => {
      const el = innerRef.current;
      if (!el || document.activeElement !== el) return;
      const grew = syncTextareaAutoGrowHeight(el, size, resolvedMaxHeight);
      if (grew) scheduleFocusRescroll();
    });
  }, [autoGrow, size, resolvedMaxHeight]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const minHeight = SIZE_MIN_HEIGHT[size];

  const inlineStyle: CSSProperties = {
    ...(autoGrow
      ? {
          minHeight,
          maxHeight: resolvedMaxHeight,
        }
      : { minHeight }),
    ...style,
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      {...gestionaleMultilineEnterProps}
      {...rest}
      ref={setRef}
      id={id}
      data-cab-auto-grow={autoGrow ? "true" : undefined}
      className={mergeClassNames(dsTextarea, "w-full", className)}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      rows={rows ?? (autoGrow ? 2 : 3)}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      style={inlineStyle}
    />
  );
}

export const GestionaleTextarea = memo(forwardRef(GestionaleTextareaInner));
