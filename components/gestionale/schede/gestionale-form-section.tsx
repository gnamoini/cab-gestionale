"use client";

import type { ReactNode } from "react";
import { dsLabel } from "@/lib/ui/design-system";
import { CAB_FIELD_LABEL_ATTR, CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";

export function FormSection({
  title,
  children,
  action,
  hideTitle = false,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  hideTitle?: boolean;
}) {
  return (
    <section
      {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
      className="space-y-3 pb-5 pt-4 first:pt-0 last:pb-0"
    >
      {!hideTitle || action ? (
        <div className="flex items-center justify-between gap-2">
          {!hideTitle ? (
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              {title}
            </h3>
          ) : null}
          {action}
        </div>
      ) : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const FORM_ALERT_STYLES = {
  danger:
    "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
  warning:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))]",
} as const;

export function FormAlert({
  children,
  variant = "danger",
  title,
}: {
  children: ReactNode;
  variant?: keyof typeof FORM_ALERT_STYLES;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-snug ${FORM_ALERT_STYLES[variant]}`}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className={title ? "mt-0.5" : "font-medium"}>{children}</p>
      </div>
    </div>
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
  layout = "stack",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  /** Id del controllo per `htmlFor` (evita label wrapper su combobox custom). */
  htmlFor?: string;
  /** `inline`: etichetta e controllo sulla stessa riga. */
  layout?: "stack" | "inline";
}) {
  const labelContent = (
    <>
      {label}
      {required ? <GestionaleRequiredMark /> : null}
    </>
  );

  if (layout === "inline") {
    return (
      <div className={`min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
        <div className="flex min-w-0 items-start gap-3">
          {htmlFor ? (
            <label
              htmlFor={htmlFor}
              {...{ [CAB_FIELD_LABEL_ATTR]: "" }}
              className={`${gestionaleFieldLabelClass} w-[10.5rem] shrink-0 pt-2.5`}
            >
              {labelContent}
            </label>
          ) : (
            <span
              {...{ [CAB_FIELD_LABEL_ATTR]: "" }}
              className={`${gestionaleFieldLabelClass} w-[10.5rem] shrink-0 pt-2.5`}
            >
              {labelContent}
            </span>
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    );
  }

  if (htmlFor) {
    return (
      <div className={`block min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
        <label htmlFor={htmlFor} {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={gestionaleFieldLabelClass}>
          {label}
          {required ? <GestionaleRequiredMark /> : null}
        </label>
        <div className="mt-1.5">{children}</div>
      </div>
    );
  }
  return (
    <div className={`block min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${className}`.trim()}>
      <span {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={gestionaleFieldLabelClass}>
        {label}
        {required ? <GestionaleRequiredMark /> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Label block senza wrapper label (es. autocomplete con label interna). */
export function FormFieldBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`block min-w-0 ${className}`.trim()}>{children}</div>;
}

export const formFieldLabelClass = dsLabel + " font-medium text-zinc-900 dark:text-zinc-100";
