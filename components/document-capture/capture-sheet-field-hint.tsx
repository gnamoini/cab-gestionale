"use client";

import type { ReactNode } from "react";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { captureHintChrome } from "@/components/document-capture/capture-ingresso-field-hint";

export function CaptureSheetHintsBanner({ reviewCount }: { reviewCount: number }) {
  if (reviewCount <= 0) return null;
  return (
    <div
      className="space-y-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] px-3 py-2.5"
      role="status"
    >
      <p className="text-sm font-medium text-[color:var(--cab-fg)]">
        {reviewCount === 1 ? "1 campo da controllare" : `${reviewCount} campi da controllare`}
      </p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">Verifica i valori evidenziati prima di importare.</p>
    </div>
  );
}

export function CaptureSheetFieldHintInline({
  fieldKey,
  hint,
  embedded = false,
}: {
  fieldKey: string;
  hint?: CaptureSheetRowHint;
  embedded?: boolean;
}) {
  if (!hint || hint.tone === "ok") return null;
  const content = hint.message ? <p>{hint.message}</p> : null;
  if (!content) return null;
  if (embedded) {
    return (
      <div className="space-y-1 text-xs text-[color:var(--cab-text-muted)]" data-capture-hint={fieldKey}>
        {content}
      </div>
    );
  }
  const chrome = captureHintChrome(hint);
  return (
    <div
      className={`space-y-1 text-xs text-[color:var(--cab-text-muted)] ${chrome?.standalone ?? ""}`}
      data-capture-hint={fieldKey}
    >
      {content}
    </div>
  );
}

export function CaptureSheetAwareField({
  hint,
  children,
  footer,
}: {
  hint?: CaptureSheetRowHint;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const chrome = hint && hint.tone !== "ok" ? captureHintChrome(hint) : null;
  if (!chrome) {
    return (
      <>
        {children}
        {footer}
      </>
    );
  }
  return (
    <div className={chrome.shell}>
      {children}
      {footer ? <div className={chrome.footer}>{footer}</div> : null}
    </div>
  );
}

export type CaptureSheetCompileBannerTone = "info" | "success" | "warning" | "busy";

export function CaptureSheetCompileStatusBanner({
  tone,
  message,
}: {
  tone: CaptureSheetCompileBannerTone;
  message: string;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40"
        : tone === "busy"
          ? "border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-fg)]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text-muted)]";
  return (
    <div role="status" className={`mb-2 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {message}
    </div>
  );
}
