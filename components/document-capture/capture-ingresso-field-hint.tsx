"use client";

import {
  captureFieldValuesEquivalent,
  type CaptureIngressoFieldHint,
} from "@/lib/document-capture/capture-ingresso-field-hints";
import { isCaptureMultilineFieldKey } from "@/lib/document-capture/capture-field-display-value";
import type { SchedaIngressoFields } from "@/types/schede";
import type { ReactNode } from "react";

const CAPTURE_HINT_FOCUS_BORDER =
  "focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]";
const CAPTURE_HINT_SUPPRESS_FOCUS_RING =
  "[&_:focus]:ring-0 [&_:focus-visible]:ring-0 [&_:focus]:border-transparent [&_:focus-visible]:border-transparent";

type CaptureHintChrome = {
  shell: string;
  footer: string;
  standalone: string;
};

export function captureHintChrome(hint: { tone: CaptureIngressoFieldHint["tone"] }): CaptureHintChrome | null {
  if (hint.tone === "ok") return null;
  if (hint.tone === "ambiguous") {
    return {
      shell: `rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_55%,var(--cab-border))] ${CAPTURE_HINT_FOCUS_BORDER} ${CAPTURE_HINT_SUPPRESS_FOCUS_RING} overflow-hidden`,
      footer:
        "border-t border-[color:color-mix(in_srgb,var(--cab-warning)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_6%,var(--cab-surface))] px-2 py-1.5",
      standalone:
        "mt-1 rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_6%,var(--cab-surface))] px-2 py-1.5",
    };
  }
  if (hint.tone === "catalog") {
    return {
      shell: `rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_45%,var(--cab-border))] ${CAPTURE_HINT_FOCUS_BORDER} ${CAPTURE_HINT_SUPPRESS_FOCUS_RING} overflow-hidden`,
      footer:
        "border-t border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_6%,var(--cab-surface))] px-2 py-1.5",
      standalone:
        "mt-1 rounded-md border border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_6%,var(--cab-surface))] px-2 py-1.5",
    };
  }
  return {
    shell: `rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-accent)_40%,var(--cab-border))] ${CAPTURE_HINT_FOCUS_BORDER} ${CAPTURE_HINT_SUPPRESS_FOCUS_RING} overflow-hidden`,
    footer:
      "border-t border-[color:color-mix(in_srgb,var(--cab-accent)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_6%,var(--cab-surface))] px-2 py-1.5",
    standalone:
      "mt-1 rounded-md border border-[color:color-mix(in_srgb,var(--cab-accent)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_6%,var(--cab-surface))] px-2 py-1.5",
  };
}

/** @deprecated Usare `captureHintChrome` — mantenuto per audit/regression. */
export function captureHintBorderClass(hint: CaptureIngressoFieldHint | undefined): string {
  if (!hint) return "";
  return captureHintChrome(hint)?.shell ?? "";
}

export function CaptureIngressoHintsBanner({ reviewCount }: { reviewCount: number }) {
  if (reviewCount <= 0) return null;
  return (
    <div
      className="space-y-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] px-3 py-2.5"
      role="status"
    >
      <p className="text-sm font-medium text-[color:var(--cab-fg)]">
        {reviewCount === 1
          ? "1 campo da controllare"
          : `${reviewCount} campi da controllare`}
      </p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Verifica i valori evidenziati prima di salvare.
      </p>
    </div>
  );
}

export function CaptureIngressoFieldHintInline<K extends keyof SchedaIngressoFields>({
  fieldKey,
  hint,
  currentValue,
  onApply,
  embedded = false,
}: {
  fieldKey: K;
  hint?: CaptureIngressoFieldHint;
  currentValue: string;
  onApply?: (key: K, value: string) => void;
  /** Hint dentro `CaptureAwareFormField` — senza bordo esterno duplicato. */
  embedded?: boolean;
}) {
  if (!hint || hint.tone === "ok") return null;

  const suggestion = hint.suggestion?.trim();
  const showApply =
    Boolean(suggestion) &&
    Boolean(onApply) &&
    !captureFieldValuesEquivalent(suggestion!, currentValue, {
      standardizeLegalSuffix: fieldKey === "cliente",
    });

  const content = (
    <>
      {hint.rawOcr && hint.tone === "suggested" ? (
        <p>
          Letto:{" "}
          <span
            className={`font-medium text-[color:var(--cab-fg)]${
              hint.captureFieldKey && isCaptureMultilineFieldKey(hint.captureFieldKey)
                ? " whitespace-pre-wrap"
                : ""
            }`}
          >
            {hint.rawOcr}
          </span>
        </p>
      ) : null}
      {suggestion && hint.tone === "suggested" ? (
        <p className="flex flex-wrap items-center gap-2">
          <span>
            Forse intendevi:{" "}
            <strong className="text-[color:var(--cab-fg)]">{suggestion}</strong>
          </span>
          {showApply ? (
            <button
              type="button"
              className="rounded border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--cab-fg)] hover:bg-[var(--cab-surface-2)]"
              onClick={() => onApply?.(fieldKey, suggestion!)}
            >
              Applica
            </button>
          ) : null}
        </p>
      ) : null}
      {hint.tone === "ambiguous" && hint.candidates?.length ? (
        <div className="space-y-1">
          <p>Più corrispondenze possibili:</p>
          <ul className="flex flex-wrap gap-1">
            {hint.candidates.map((c) => (
              <li key={`${c.id ?? "null"}-${c.label}`}>
                <button
                  type="button"
                  className="rounded border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-0.5 text-[11px] hover:bg-[var(--cab-surface-2)]"
                  onClick={() => onApply?.(fieldKey, c.label)}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hint.message ? <p>{hint.message}</p> : null}
    </>
  );

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

export function CaptureAwareFormField({
  hint,
  children,
  footer,
}: {
  hint?: CaptureIngressoFieldHint;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const chrome = hint ? captureHintChrome(hint) : null;
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
