"use client";

import type { PullToRefreshPhase } from "@/lib/ui/pull-to-refresh-contract";

export function PullToRefreshIndicator({
  phase,
  progress,
}: {
  phase: PullToRefreshPhase;
  progress: number;
}) {
  if (phase === "idle") return null;

  const visible = phase === "refreshing" || progress > 0.05;
  if (!visible) return null;

  const scale = phase === "refreshing" ? 1 : 0.35 + progress * 0.65;
  const opacity = phase === "refreshing" ? 1 : Math.min(1, progress * 1.2);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]"
      aria-hidden
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] ${
          phase === "refreshing" ? "motion-safe:animate-spin" : ""
        }`}
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: phase === "refreshing" ? undefined : "transform 120ms ease-out, opacity 120ms ease-out",
        }}
      >
        <svg
          className="h-5 w-5 text-[color:var(--cab-primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M21 21v-5h-5" />
        </svg>
      </div>
    </div>
  );
}
