"use client";

import { LoadingProgressBar } from "@/components/design-system/loading/loading-progress-bar";
import { loadingMessageClass } from "@/components/design-system/loading/loading-tokens";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
import type { InventoryReceivingAcquisitionState } from "@/lib/inventory-receiving/inventory-receiving-acquisition-progress";
import { useEffect, useState } from "react";

function useCreepingProgress(active: boolean, from: number, to: number): number {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!active) {
      setValue(from);
      return;
    }
    setValue(from);
    const id = window.setInterval(() => {
      setValue((current) => (current >= to ? to : current + 1.2));
    }, 350);
    return () => window.clearInterval(id);
  }, [active, from, to]);

  return value;
}

export type CaptureAcquisitionProgressVariant =
  | { mode: "bar"; state: CaptureAcquisitionProgressState }
  | { mode: "checklist"; state: InventoryReceivingAcquisitionState };

export function CaptureAcquisitionProgress({ variant }: { variant: CaptureAcquisitionProgressVariant }) {
  if (variant.mode === "bar") {
    return <CaptureAcquisitionProgressBar state={variant.state} />;
  }
  return <CaptureAcquisitionProgressChecklist state={variant.state} />;
}

function CaptureAcquisitionProgressBar({ state }: { state: CaptureAcquisitionProgressState }) {
  const creep = useCreepingProgress(state.creeping, state.progress, 94);
  const barProgress = state.creeping ? creep : state.progress;

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

function CaptureAcquisitionProgressChecklist({ state }: { state: InventoryReceivingAcquisitionState }) {
  if (!state.active && !state.error) return null;

  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center gap-4 px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy={!state.error}
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
    </div>
  );
}

/** @deprecated Use CaptureAcquisitionProgress with mode bar */
export function DocumentCaptureAcquisitionProgress({ state }: { state: CaptureAcquisitionProgressState }) {
  return <CaptureAcquisitionProgress variant={{ mode: "bar", state }} />;
}
