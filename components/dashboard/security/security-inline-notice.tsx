"use client";

import type { ReactNode } from "react";

export const securitySubsectionShellClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))]";

type NoticeVariant = "warning" | "danger" | "info";

const VARIANT_STYLES: Record<NoticeVariant, string> = {
  warning:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] text-[color:var(--cab-text)]",
  danger:
    "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
  info:
    "border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] text-[color:var(--cab-text)]",
};

function NoticeIcon({ variant, className = "mt-0.5 h-4 w-4 shrink-0" }: { variant: NoticeVariant; className?: string }) {
  if (variant === "danger" || variant === "warning") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

const INLINE_TEXT_STYLES: Record<NoticeVariant, string> = {
  warning: "text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))]",
  danger: "text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
  info: "text-[color:var(--cab-text-muted)]",
};

type Props = {
  variant?: NoticeVariant;
  title?: string;
  children: ReactNode;
  /** @deprecated Prefer `appearance="inline"` for field-level hints. */
  compact?: boolean;
  /** `box` = pannello con bordo; `inline` = hint sotto il campo (senza box). */
  appearance?: "box" | "inline";
  id?: string;
  className?: string;
};

export function SecurityInlineNotice({
  variant = "warning",
  title,
  children,
  compact = false,
  appearance = "box",
  id,
  className = "",
}: Props) {
  const role = variant === "danger" ? "alert" : "status";

  if (appearance === "inline") {
    return (
      <p
        id={id}
        role={role}
        className={`flex items-start gap-1.5 text-[11px] leading-snug ${INLINE_TEXT_STYLES[variant]} ${className}`.trim()}
      >
        <NoticeIcon variant={variant} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">{children}</span>
      </p>
    );
  }

  return (
    <div
      id={id}
      role={role}
      className={`flex items-start gap-2.5 rounded-[var(--ds-radius-lg)] border ${VARIANT_STYLES[variant]} ${compact ? "px-2 py-1" : "px-3 py-2.5"} ${className}`.trim()}
    >
      <NoticeIcon variant={variant} />
      <div className="min-w-0 flex-1">
        {title ? <p className={`font-semibold ${compact ? "text-[10px]" : "text-xs"}`}>{title}</p> : null}
        <div className={`${compact ? "text-[10px] leading-snug" : "text-xs leading-relaxed"} ${title ? "mt-0.5" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
