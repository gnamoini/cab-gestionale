"use client";

import {
  gestionaleCollapsibleChevronBoxClass,
  gestionaleCollapsibleChevronBoxExpandedClass,
  gestionaleCollapsibleChevronIconClass,
} from "@/lib/ui/gestionale-collapsible-toggle";

/** Icona chevron SSOT (ShellCard Lavorazioni, form collapsible, impostazioni). */
export function GestionaleCollapsibleChevronIcon({
  expanded,
  className = "",
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`${gestionaleCollapsibleChevronIconClass}${expanded ? " rotate-180" : ""} text-[color:var(--cab-text-muted)] ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Box chevron SSOT — bordo/sfondo token, icona centrata. */
export function GestionaleCollapsibleChevronBox({
  expanded,
  className = "",
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${gestionaleCollapsibleChevronBoxClass}${
        expanded ? ` ${gestionaleCollapsibleChevronBoxExpandedClass}` : ""
      }${className ? ` ${className}` : ""}`}
    >
      <GestionaleCollapsibleChevronIcon expanded={expanded} />
    </span>
  );
}
