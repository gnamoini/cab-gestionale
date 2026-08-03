"use client";

import { LoadingProgressBar } from "@/components/design-system/loading/loading-progress-bar";
import { loadingMessageClass } from "@/components/design-system/loading/loading-tokens";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
import type { InventoryReceivingAcquisitionState } from "@/lib/inventory-receiving/inventory-receiving-acquisition-progress";

export type CaptureAcquisitionProgressVariant =
  | { mode: "bar"; state: CaptureAcquisitionProgressState }
  | { mode: "checklist"; state: InventoryReceivingAcquisitionState };

type AcquisitionChecklistState = {
  active: boolean;
  error: string | null;
  checks: Array<{ id: string; label: string; active: boolean; done: boolean }>;
};

export function CaptureAcquisitionProgress({ variant }: { variant: CaptureAcquisitionProgressVariant }) {
  if (variant.mode === "bar") {
    return <CaptureAcquisitionProgressBar state={variant.state} />;
  }
  return <CaptureAcquisitionProgressChecklist state={variant.state} />;
}

function CaptureAcquisitionProgressBar({ state }: { state: CaptureAcquisitionProgressState }) {
  const barProgress = state.progress;

  if (!state.active && !state.error) return null;

  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center gap-4 px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy={!state.error}
    >
      {!state.error ? (
        <>
          <LoadingProgressBar
            className="max-w-md"
            progress={Math.round(Math.min(100, Math.max(0, barProgress)))}
            label={state.label}
          />
          <p className={`max-w-md text-center ${loadingMessageClass}`}>{state.label}</p>
          {state.checklist?.length ? (
            <CaptureAcquisitionProgressChecklist
              state={{ active: state.active, error: state.error, checks: state.checklist }}
              heartbeatLabel={state.heartbeatLabel}
              compact
            />
          ) : null}
        </>
      ) : (
        <>
          <p className={`max-w-md text-center ${loadingMessageClass}`}>{state.label}</p>
          <p className="max-w-md text-center text-sm text-[color:var(--cab-danger)]">{state.error}</p>
        </>
      )}
    </div>
  );
}

function CaptureAcquisitionProgressChecklist({
  state,
  heartbeatLabel,
  compact = false,
}: {
  state: AcquisitionChecklistState;
  heartbeatLabel?: string | null;
  compact?: boolean;
}) {
  if (!state.active && !state.error) return null;

  return (
    <div
      className={compact ? "w-full max-w-md space-y-2" : "flex min-h-[12rem] flex-col items-center justify-center gap-4 px-4 py-10"}
      role={compact ? undefined : "status"}
      aria-live={compact ? "polite" : "polite"}
      aria-busy={compact ? undefined : !state.error}
    >
      {state.error ? (
        <p className="max-w-md text-center text-sm text-[color:var(--cab-danger)]">{state.error}</p>
      ) : (
        <ul className="w-full max-w-md space-y-2 text-sm">
          {state.checks.map((check) => (
            <li
              key={check.id}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                check.active
                  ? "border-[color:color-mix(in_srgb,var(--cab-accent)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_8%,var(--cab-surface))]"
                  : "border-[color:var(--cab-border)] bg-[var(--cab-surface)]"
              }`}
            >
              <span
                aria-hidden
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  check.done
                    ? "bg-[var(--cab-accent)] text-[var(--cab-accent-fg)]"
                    : check.active
                      ? "border border-[color:var(--cab-accent)] text-[color:var(--cab-accent)]"
                      : "border border-[color:var(--cab-border)] text-[color:var(--cab-muted-fg)]"
                }`}
              >
                {check.done ? "✓" : check.active ? "…" : "○"}
              </span>
              <span className={check.done ? "text-[color:var(--cab-fg)]" : "text-[color:var(--cab-text-muted)]"}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {heartbeatLabel ? (
        <p className="max-w-md text-center text-xs text-[color:var(--cab-text-muted)]" aria-live="polite">
          ⟳ {heartbeatLabel}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use CaptureAcquisitionProgress with mode bar */
export function DocumentCaptureAcquisitionProgress({ state }: { state: CaptureAcquisitionProgressState }) {
  return <CaptureAcquisitionProgress variant={{ mode: "bar", state }} />;
}

/** Barra + messaggio da stato pipeline (nessuna rotazione fittizia). */
export function CaptureStatusProgress({ state }: { state: CaptureAcquisitionProgressState }) {
  return <CaptureAcquisitionProgress variant={{ mode: "bar", state }} />;
}
