"use client";

import type { ReactNode } from "react";
import { dsLabel } from "@/lib/ui/design-system";
import { CAB_FIELD_LABEL_ATTR, CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";

export function FormSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
      className="space-y-3 border-b border-[color:var(--cab-border)] pb-4 last:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function GestionaleRequiredMark() {
  return (
    <span className="text-[color:var(--cab-primary)]" aria-hidden>
      {" "}
      *
    </span>
  );
}

export function FormField({
  label,
  children,
  className = "",
  required,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  /** Id del controllo per `htmlFor` (evita label wrapper su combobox custom). */
  htmlFor?: string;
}) {
  if (htmlFor) {
    return (
      <div className={`block min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
        <label htmlFor={htmlFor} {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={gestionaleFieldLabelClass}>
          {label}
          {required ? <GestionaleRequiredMark /> : null}
        </label>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  return (
    <div className={`block min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
      <span {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={gestionaleFieldLabelClass}>
        {label}
        {required ? <GestionaleRequiredMark /> : null}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** Label block senza wrapper label (es. autocomplete con label interna). */
export function FormFieldBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`block min-w-0 ${className}`.trim()}>{children}</div>;
}

export const formFieldLabelClass = dsLabel + " font-medium text-zinc-900 dark:text-zinc-100";
