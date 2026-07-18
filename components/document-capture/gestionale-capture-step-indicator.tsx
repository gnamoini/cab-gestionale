"use client";

import type { CaptureStep } from "@/lib/document-capture/capture-experience-adapter";

function StepCheckIcon({ className = "h-3 w-3 sm:h-3.5 sm:w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.2 6.4 11 12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  steps: readonly CaptureStep[];
  current: string;
  ariaLabel?: string;
};

export function GestionaleCaptureStepIndicator({ steps, current, ariaLabel = "Passaggi acquisizione" }: Props) {
  const currentIndex = Math.max(0, steps.findIndex((s) => s.id === current));
  const progressPct = ((currentIndex + 1) / steps.length) * 100;
  const trackFillRatio = steps.length > 1 ? currentIndex / (steps.length - 1) : 1;
  const gridCols =
    steps.length === 2 ? "grid-cols-2" : steps.length === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-0 z-[2] -mx-1 min-w-0 bg-[var(--cab-card)] px-0.5 pb-2 pt-1 sm:px-1 sm:pb-3 sm:pt-0.5"
    >
      <div className="relative min-w-0 px-1 sm:px-0.5">
        <div
          aria-hidden
          className="pointer-events-none absolute top-3 left-[16.666%] h-px w-[66.666%] bg-[color:var(--cab-border)] opacity-35 sm:top-3.5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-3 left-[16.666%] h-px bg-[color:color-mix(in_srgb,var(--cab-accent)_70%,var(--cab-border))] transition-[width] duration-300 ease-out motion-reduce:transition-none sm:top-3.5"
          style={{ width: `calc(66.666% * ${trackFillRatio})` }}
        />
        <ol className={`relative grid w-full min-w-0 ${gridCols} gap-x-0.5`}>
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            const upcoming = index > currentIndex;

            return (
              <li
                key={step.id}
                className="flex min-w-0 flex-col items-center gap-0.5 text-center sm:gap-1"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-[background-color,border-color,color,box-shadow,opacity] duration-200 sm:h-7 sm:w-7 sm:text-xs ${
                    active
                      ? "bg-[var(--cab-accent)] text-[var(--cab-accent-fg)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--cab-accent)_28%,transparent),var(--cab-shadow-sm)] sm:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-accent)_32%,transparent),var(--cab-shadow-sm)]"
                      : done
                        ? "border border-[color:color-mix(in_srgb,var(--cab-accent)_48%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-accent)_88%,var(--cab-text))]"
                        : "border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,transparent)] text-[color:var(--cab-muted-fg)] opacity-55"
                  }`}
                >
                  {done ? <StepCheckIcon /> : index + 1}
                </span>
                <span
                  className={`max-w-full truncate px-0.5 text-[9px] leading-tight sm:text-xs ${
                    active
                      ? "font-semibold text-[color:var(--cab-fg)]"
                      : done
                        ? "font-medium text-[color:color-mix(in_srgb,var(--cab-text)_72%,var(--cab-muted-fg))]"
                        : "font-normal text-[color:var(--cab-muted-fg)] opacity-55"
                  }`}
                >
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
                {upcoming ? <span className="sr-only"> — in attesa</span> : null}
                {done ? <span className="sr-only"> — completato</span> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className="mx-1 mt-2 h-0.5 w-[calc(100%-0.5rem)] overflow-hidden rounded-full bg-[color:var(--cab-border)] sm:mt-3"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[var(--cab-accent)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="sr-only">
        Passaggio {currentIndex + 1} di {steps.length}: {steps[currentIndex]?.label}
      </p>
    </nav>
  );
}
