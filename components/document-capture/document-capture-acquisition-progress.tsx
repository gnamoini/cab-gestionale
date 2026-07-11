"use client";

import { LoadingProgressBar } from "@/components/design-system/loading/loading-progress-bar";
import { loadingMessageClass } from "@/components/design-system/loading/loading-tokens";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
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

export function DocumentCaptureAcquisitionProgress({
  state,
}: {
  state: CaptureAcquisitionProgressState;
}) {
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
