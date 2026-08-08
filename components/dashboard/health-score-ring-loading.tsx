"use client";

import type { CSSProperties } from "react";
import { LOADING_SPINNER_DURATION_MS } from "@/components/design-system/loading/loading-tokens";

const RING_SIZE = 68;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function HealthScoreRingLoading() {
  const arc = RING_CIRCUMFERENCE * 0.28;
  const gap = RING_CIRCUMFERENCE - arc;
  const spinStyle = {
    "--cab-spinner-duration": `${LOADING_SPINNER_DURATION_MS}ms`,
  } as CSSProperties;

  return (
    <div
      className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))]"
      role="status"
      aria-label="Caricamento stato operativo"
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90 shrink-0 cab-spinner-ring motion-reduce:animation-none"
        style={spinStyle}
        aria-hidden
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          className="stroke-[color:color-mix(in_srgb,var(--cab-border)_88%,transparent)]"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          className="stroke-[color:var(--cab-primary)]"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${gap}`}
        />
      </svg>
    </div>
  );
}
