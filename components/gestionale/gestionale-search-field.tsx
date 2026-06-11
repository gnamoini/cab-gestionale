"use client";

import type { InputHTMLAttributes } from "react";
import { chainGestionaleEnterKeyDown } from "@/lib/ui/gestionale-focus-navigation";
import { dsSearchFieldInput } from "@/lib/ui/design-system";
import { resolveGestionaleInputClassName } from "@/lib/ui/global-input";

export function IconGestionaleSearchMagnifier({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

const iconWrapClass =
  "pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--cab-text-muted)] transition-colors duration-200 group-focus-within:text-[color:color-mix(in_srgb,var(--cab-primary)_78%,var(--cab-text-muted))]";

const searchWrapClass =
  "group relative min-h-11 min-w-0 w-full rounded-[var(--ds-radius-lg)] transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-primary)_12%,transparent)]";

export type GestionaleSearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
  wrapperClassName?: string;
  invalid?: boolean;
};

export function GestionaleSearchField({
  className = "",
  wrapperClassName = "",
  invalid = false,
  onKeyDown,
  ...rest
}: GestionaleSearchFieldProps) {
  return (
    <div className={`${searchWrapClass} ${wrapperClassName}`.trim()}>
      <span className={iconWrapClass} aria-hidden>
        <IconGestionaleSearchMagnifier />
      </span>
      <input
        type="search"
        aria-invalid={invalid || undefined}
        className={resolveGestionaleInputClassName(`${dsSearchFieldInput} ${className}`.trim(), invalid)}
        onKeyDown={(e) => chainGestionaleEnterKeyDown(e, onKeyDown)}
        {...rest}
      />
    </div>
  );
}
