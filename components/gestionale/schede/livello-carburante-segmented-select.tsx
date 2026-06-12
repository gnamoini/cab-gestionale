"use client";

import type { CSSProperties } from "react";
import {
  formatLivelloCarburanteDisplay,
  livelloCarburanteToStored,
  parseLivelloCarburantePercent,
} from "@/lib/schede/livello-carburante-value";
import { dsFocus } from "@/lib/ui/design-system";

/** Altezza allineata a `dsInput` / GestionaleNumberInput (~46px con py-2.5). */
const shellClass =
  "w-full rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] px-3 shadow-[var(--cab-shadow-sm)]";
const rowClass = "flex h-[2.875rem] min-w-0 items-center gap-3";

function rangeTrackStyle(percent: number, active: boolean): CSSProperties {
  return { "--livello-pct": active ? `${percent}%` : "0%" } as CSSProperties;
}

export function LivelloCarburanteSegmentedSelect({
  id,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel = "Livello carburante",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const percent = parseLivelloCarburantePercent(value);
  const hasValue = percent !== null;
  const sliderValue = percent ?? 0;
  const displayLabel = hasValue ? formatLivelloCarburanteDisplay(value) : "—";

  return (
    <div id={id} className={shellClass} role="group" aria-label={ariaLabel}>
      <div className={rowClass}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hasValue ? sliderValue : undefined}
          aria-valuetext={hasValue ? displayLabel : "Non specificato"}
          style={rangeTrackStyle(sliderValue, hasValue)}
          className={`livello-carburante-range min-w-0 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${dsFocus}`}
          onChange={(e) => onChange(livelloCarburanteToStored(Number(e.target.value)))}
        />
        <span
          className={`w-10 shrink-0 text-right text-sm font-semibold tabular-nums ${
            hasValue ? "text-[color:var(--cab-text)]" : "text-[color:var(--cab-text-muted)]"
          }`}
          aria-live="polite"
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
}
