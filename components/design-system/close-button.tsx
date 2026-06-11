"use client";

import type { ButtonHTMLAttributes } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import { dsFocus } from "@/lib/ui/design-system";

export type CloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  /** Default false — `aria-label` basta; evita overhead tooltip al focus su mobile. */
  showOnFocus?: boolean;
};

export function CloseButton({
  label = "Chiudi",
  showOnFocus = false,
  className = "",
  type = "button",
  ...props
}: CloseButtonProps) {
  return (
    <Tooltip content={label} showOnFocus={showOnFocus}>
      <button
        type={type}
        aria-label={label}
        className={`inline-flex min-w-0 h-9 w-9 max-md:min-h-11 max-md:min-w-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-lg leading-none text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] disabled:pointer-events-none disabled:opacity-50 ${dsFocus} ${className}`}
        {...props}
      >
        <span aria-hidden>×</span>
      </button>
    </Tooltip>
  );
}
