"use client";

import { useCallback, useState, type CSSProperties } from "react";
import {
  formatLivelloCarburanteDisplay,
  LIVELLO_CARBURANTE_PRESETS,
  livelloCarburanteThumbCenterCss,
  livelloCarburanteToStored,
  parseLivelloCarburantePercent,
  snapLivelloCarburantePercent,
} from "@/lib/schede/livello-carburante-value";
import { dsFocus } from "@/lib/ui/design-system";

const shellClass =
  "w-full min-h-10 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] px-3 shadow-[var(--cab-shadow-sm)]";
const rowClass = "flex h-10 min-w-0 items-center gap-3";
const trackWrapClass = "relative min-w-0 flex-1 self-center";
const trackLayerClass =
  "pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2";
const snapMarksClass =
  "pointer-events-none absolute inset-x-0 top-1/2 z-[5] -translate-y-1/2";
const snapMarkClass = "absolute top-1/2 -translate-x-1/2 -translate-y-1/2";
const snapDotBaseClass =
  "block rounded-full shadow-[0_0_0_1px_color-mix(in_srgb,var(--cab-card)_88%,var(--cab-border))] transition-[transform,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none";
const snapDotIdleClass =
  "h-1.5 w-1.5 bg-[color:color-mix(in_srgb,var(--cab-text)_52%,var(--cab-border))]";
const snapDotActiveClass =
  "h-2 w-2 scale-110 bg-[var(--cab-primary)] shadow-[0_0_0_2px_var(--cab-card)]";
const snapDotDraggingClass = "scale-125";

function thumbCenterStyle(percent: number): CSSProperties {
  return { left: livelloCarburanteThumbCenterCss(percent) };
}

function fillWidthStyle(percent: number): CSSProperties {
  return { width: livelloCarburanteThumbCenterCss(percent) };
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
  const storedPercent = parseLivelloCarburantePercent(value);
  const hasValue = storedPercent !== null;
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const sliderValue = dragPercent ?? storedPercent ?? 0;
  const isActive = hasValue || dragPercent !== null;
  const displayLabel = isActive ? formatLivelloCarburanteDisplay(`${sliderValue}%`) : "—";
  const snappedPercent = isActive ? snapLivelloCarburantePercent(sliderValue) : null;

  const commitValue = useCallback(
    (raw: number) => {
      setDragPercent(null);
      setIsInteracting(false);
      onChange(livelloCarburanteToStored(snapLivelloCarburantePercent(raw)));
    },
    [onChange],
  );

  return (
    <div id={id} className={shellClass} role="group" aria-label={ariaLabel}>
      <div className={rowClass}>
        <div className={trackWrapClass}>
          <div className={trackLayerClass} aria-hidden>
            <div className="livello-carburante-track" />
            {isActive ? (
              <div className="livello-carburante-fill" style={fillWidthStyle(sliderValue)} />
            ) : null}
          </div>
          <div className={snapMarksClass} aria-hidden>
            {LIVELLO_CARBURANTE_PRESETS.map(({ percent }) => {
              const active = snappedPercent === percent;
              return (
                <span key={percent} className={snapMarkClass} style={thumbCenterStyle(percent)}>
                  <span
                    className={`${snapDotBaseClass} ${active ? snapDotActiveClass : snapDotIdleClass} ${
                      isInteracting && active ? snapDotDraggingClass : ""
                    }`}
                  />
                </span>
              );
            })}
          </div>
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
            aria-valuenow={isActive ? sliderValue : undefined}
            aria-valuetext={isActive ? displayLabel : "Non specificato"}
            className={`livello-carburante-range relative z-10 w-full min-w-0 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${dsFocus} ${
              isInteracting ? "livello-carburante-range--active" : ""
            }`}
            onPointerDown={() => setIsInteracting(true)}
            onChange={(e) => setDragPercent(Number(e.target.value))}
            onPointerUp={(e) => commitValue(Number(e.currentTarget.value))}
            onPointerCancel={(e) => commitValue(Number(e.currentTarget.value))}
            onBlur={(e) => {
              if (dragPercent !== null) commitValue(Number(e.currentTarget.value));
            }}
            onKeyUp={(e) => {
              if (
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "Enter" ||
                e.key === " "
              ) {
                commitValue(Number(e.currentTarget.value));
              }
            }}
          />
        </div>
        <span
          className={`w-10 shrink-0 text-right text-sm font-semibold tabular-nums ${
            isActive ? "text-[color:var(--cab-text)]" : "text-[color:var(--cab-text-muted)]"
          }`}
          aria-live="polite"
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
}
