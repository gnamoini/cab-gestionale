"use client";

import type { ReactNode } from "react";
import { dsLabel } from "@/lib/ui/design-system";

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
    <section className="space-y-3 border-b border-[color:var(--cab-border)] pb-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  children,
  className = "",
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
      {label}
      {required ? <span className="text-[color:var(--cab-primary)]"> *</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Label block senza wrapper label (es. autocomplete con label interna). */
export function FormFieldBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`block min-w-0 ${className}`.trim()}>{children}</div>;
}

export const formFieldLabelClass = dsLabel + " font-medium text-zinc-900 dark:text-zinc-100";
