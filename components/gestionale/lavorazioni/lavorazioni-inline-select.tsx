"use client";

import type { CSSProperties, ReactNode } from "react";
import { selectPillInner } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

/** Pill colorata solo lettura (storico): stessa silhouette delle celle tabella principale. */
export function TablePillReadonly({
  shellClass,
  shellStyle,
  title,
  children,
  fitContent = false,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  children: ReactNode;
  fitContent?: boolean;
}) {
  const widthClass = fitContent ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const textClass = fitContent
    ? "min-w-0 flex-1 whitespace-nowrap text-[11px] font-semibold leading-tight tracking-wide text-inherit"
    : "min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight tracking-wide text-inherit";
  return (
    <div className={`${shellClass} ${widthClass}`} style={shellStyle} title={title}>
      <div className="relative flex min-h-8 w-full items-center rounded-[inherit] px-2 py-0.5">
        <span className={textClass}>{children}</span>
      </div>
    </div>
  );
}

/** Select compatto tabella con chevron e altezza fissa (stato / priorità / addetto). */
export function InlineSelectField({
  shellClass,
  shellStyle,
  title,
  value,
  onChange,
  ariaLabel,
  disabled,
  wide = false,
  children,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  /** Disabilita il select (es. durante mutazioni in corso). */
  disabled?: boolean;
  /** Larghezza maggiore per label stato lunghe (senza troncamento). */
  wide?: boolean;
  children: ReactNode;
}) {
  const widthClass = wide ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const pillInnerClass = wide
    ? `${selectPillInner} whitespace-nowrap pr-8`
    : selectPillInner;
  return (
    <div
      className={`${shellClass} group ${widthClass} ${disabled ? "opacity-60" : ""}`}
      style={shellStyle}
      title={title}
    >
      <div className="relative flex min-h-8 w-full items-stretch rounded-[inherit]">
        <select
          className={pillInnerClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          disabled={disabled}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
