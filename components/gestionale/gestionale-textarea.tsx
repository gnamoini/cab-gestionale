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

/** Misura e applica altezza auto-grow (pattern iOS-safe: auto → scrollHeight, cap su maxHeight). */
function syncTextareaAutoGrowHeight(
  el: HTMLTextAreaElement,
  size: GestionaleTextareaSize,
  maxHeightCss: string | undefined,
): void {
  el.style.height = "auto";
  const minPx = minHeightPx(size);
  let next = Math.max(minPx, el.scrollHeight);

  if (maxHeightCss) {
    el.style.maxHeight = maxHeightCss;
    const maxPx = parseFloat(getComputedStyle(el).maxHeight);
    if (Number.isFinite(maxPx) && maxPx > 0) {
      next = Math.min(next, maxPx);
    }
  }

  const nextPx = `${next}px`;
  if (el.style.height !== nextPx) {
    el.style.height = nextPx;
  }
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
  const resolvedMaxHeight = autoGrow ? (maxHeightProp ?? gestionaleTextareaMaxHeightDefault) : undefined;

  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  useLayoutEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;
    syncTextareaAutoGrowHeight(el, size, resolvedMaxHeight);
  }, [autoGrow, value, readOnly, size, resolvedMaxHeight]);

  useEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;

    const onResize = () => syncTextareaAutoGrowHeight(el, size, resolvedMaxHeight);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [autoGrow, size, resolvedMaxHeight]);

  const minHeight = SIZE_MIN_HEIGHT[size];

  const inlineStyle: CSSProperties = {
    ...style,
    ...(autoGrow
      ? {
          overflowY: "auto",
          minHeight,
          maxHeight: resolvedMaxHeight,
        }
      : { minHeight }),
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
