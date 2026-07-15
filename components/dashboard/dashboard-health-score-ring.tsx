"use client";

import type { ReactNode } from "react";
import type {
  OperationalHealthFactor,
  OperationalHealthScore,
  OperationalHealthTone,
} from "@/lib/dashboard/operational-health-score";
import { splitHealthFactors } from "@/lib/dashboard/operational-health-score";
import { dsSkeletonPulse, dsTypoCaption } from "@/lib/ui/design-system";

const RING_SIZE = 68;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const TONE_RING_COLOR: Record<OperationalHealthTone, string> = {
  excellent: "var(--cab-success)",
  good: "var(--cab-primary)",
  warn: "var(--cab-warning)",
  critical: "var(--cab-danger)",
  neutral: "var(--cab-text-muted)",
};

const TONE_GLOW: Record<OperationalHealthTone, string> = {
  excellent: "color-mix(in srgb, var(--cab-success) 14%, transparent)",
  good: "color-mix(in srgb, var(--cab-primary) 12%, transparent)",
  warn: "color-mix(in srgb, var(--cab-warning) 14%, transparent)",
  critical: "color-mix(in srgb, var(--cab-danger) 14%, transparent)",
  neutral: "color-mix(in srgb, var(--cab-border) 60%, transparent)",
};

function healthScoreRingGlow(tone: OperationalHealthTone): string {
  const c = TONE_RING_COLOR[tone];
  return `0 0 16px color-mix(in srgb, ${c} 55%, transparent)`;
}

function HealthScoreRingValue({ score, tone }: { score: number; tone: OperationalHealthTone }) {
  const color = TONE_RING_COLOR[tone];
  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-extrabold tabular-nums leading-none tracking-tight"
      style={{ color, textShadow: healthScoreRingGlow(tone) }}
      aria-hidden
    >
      {score}
    </span>
  );
}

function HealthScoreRing({
  score,
  tone,
  glow,
}: {
  score: number;
  tone: OperationalHealthTone;
  glow: string;
}) {
  const color = TONE_RING_COLOR[tone];
  return (
    <div
      className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))]"
      style={{
        boxShadow: `inset 0 0 0 1px ${glow}, 0 0 22px color-mix(in srgb, ${color} 18%, transparent)`,
        background: `radial-gradient(circle at 50% 42%, color-mix(in srgb, ${color} 12%, var(--cab-card)) 0%, color-mix(in srgb, var(--cab-surface-2) 35%, var(--cab-card)) 68%)`,
      }}
    >
      <HealthScoreRingSvg score={score} tone={tone} />
      <HealthScoreRingValue score={score} tone={tone} />
    </div>
  );
}

function HealthScoreTextColumn({
  title,
  score,
  label,
  labelColor,
}: {
  title: string;
  score?: number;
  label: string;
  labelColor?: string;
}) {
  return (
    <div className="min-w-0 shrink-0 text-left">
      {title ? (
        <p className="text-[11px] font-semibold leading-none text-[color:var(--cab-text-muted)]">{title}</p>
      ) : null}
      {score != null ? (
        <p className="mt-1 text-base font-bold tabular-nums leading-none text-[color:var(--cab-text)]">
          {score}
          <span className="text-xs font-semibold text-[color:var(--cab-text-muted)]">/100</span>
        </p>
      ) : null}
      <p
        className={`${score != null ? "mt-1" : "mt-1.5"} text-sm font-semibold leading-tight`}
        style={labelColor ? { color: labelColor } : undefined}
      >
        {label}
      </p>
    </div>
  );
}

function HealthScoreLayout({
  ring,
  text,
}: {
  ring: ReactNode;
  text: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-3">
      {ring}
      {text}
    </div>
  );
}

function formatImpact(impact: number): string {
  if (impact === 0) return "0";
  return impact > 0 ? `+${impact}` : `${impact}`;
}

function HealthScoreRingSvg({ score, tone }: { score: number; tone: OperationalHealthTone }) {
  const offset = RING_CIRCUMFERENCE * (1 - score / 100);
  const color = TONE_RING_COLOR[tone];

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="-rotate-90 shrink-0"
      aria-hidden
      style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 65%, transparent))` }}
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
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

function FactorList({
  title,
  factors,
  tone,
}: {
  title: string;
  factors: OperationalHealthFactor[];
  tone: "up" | "down";
}) {
  if (factors.length === 0) return null;
  const toneClass =
    tone === "up"
      ? "text-[color:var(--cab-success)]"
      : "text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]";

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {factors.slice(0, 6).map((factor) => (
          <li
            key={`${tone}-${factor.label}`}
            className="flex min-w-0 items-start justify-between gap-2.5 text-sm leading-snug text-[color:var(--cab-text)]"
          >
            <span className="min-w-0 break-words">{factor.label}</span>
            <span className={`shrink-0 font-semibold tabular-nums ${toneClass}`}>{formatImpact(factor.impact)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthScoreSummarySkeleton() {
  return (
    <HealthScoreLayout
      ring={<div className={`h-[4.25rem] w-[4.25rem] shrink-0 rounded-full ${dsSkeletonPulse}`} aria-hidden />}
      text={
        <div className="min-w-0 shrink-0 space-y-2" aria-hidden>
          <div className={`h-3 w-20 ${dsSkeletonPulse}`} />
          <div className={`h-4 w-14 ${dsSkeletonPulse}`} />
        </div>
      }
    />
  );
}

export function HealthScoreSummary({
  score,
  label,
  tone,
  insufficientData = false,
  hideTitle = false,
}: {
  score: number | null;
  label: string;
  tone: OperationalHealthTone;
  insufficientData?: boolean;
  /** Widget shell già espone il titolo sezione. */
  hideTitle?: boolean;
}) {
  const toneColor = TONE_RING_COLOR[tone];

  return (
    <HealthScoreLayout
      ring={
        insufficientData || score == null ? (
          <div
            className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-card)] text-xs font-semibold text-[color:var(--cab-text-muted)]"
            aria-hidden
          >
            —
          </div>
        ) : (
          <HealthScoreRing score={score} tone={tone} glow={TONE_GLOW[tone]} />
        )
      }
      text={
        <HealthScoreTextColumn
          title={hideTitle ? "" : "Stato operativo"}
          score={score ?? undefined}
          label={label}
          labelColor={insufficientData ? undefined : toneColor}
        />
      }
    />
  );
}

export function HealthScoreBreakdownBody({ score }: { score: OperationalHealthScore }) {
  const { positive, negative } = splitHealthFactors(score.factors.filter((f) => f.impact !== 0));

  return (
    <div className="min-w-0 space-y-3.5">
      <p className={`${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>{score.periodLabel}</p>
      <FactorList title="Ha alzato il punteggio" factors={positive} tone="up" />
      <FactorList title="Ha abbassato il punteggio" factors={negative} tone="down" />
      {positive.length === 0 && negative.length === 0 ? (
        <p className="text-sm leading-snug text-[color:var(--cab-text-muted)]">
          Nessuna variazione rilevante rispetto al periodo precedente.
        </p>
      ) : null}
    </div>
  );
}
