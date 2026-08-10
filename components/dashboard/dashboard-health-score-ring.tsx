"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type {
  OperationalHealthFactor,
  OperationalHealthScore,
  OperationalHealthSectionSummary,
  OperationalHealthTone,
} from "@/lib/dashboard/operational-health-score";
import { splitHealthFactors } from "@/lib/dashboard/operational-health-score";
import {
  HealthScoreWeeklyTrendChart,
  type HealthScoreWeeklyTrendPoint,
} from "@/components/dashboard/dashboard-health-score-trend-chart";
import { HealthScoreRingLoading } from "@/components/dashboard/health-score-ring-loading";
import { HealthScoreTargetsDialog } from "@/components/dashboard/health-score-targets-dialog";
import { HubIconPencil } from "@/components/design-system/hub-table-action-icons";
import { IconActionButton } from "@/components/design-system/icon-action-button";
import { Tooltip } from "@/components/ui";
import { reportMetricCardCompactClass } from "@/components/report/report-ui-tokens";
import {
  reportArrowAndTone,
  reportCompareBadgeClass,
} from "@/components/report/report-ui-tokens";
import { dsSkeletonPulse, dsTableActionBtnSecondary, dsTableActionGlyph, dsTypoCaption } from "@/lib/ui/design-system";
import { usePermissions } from "@/src/hooks/use-permissions";

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

const FACTOR_LIST_MAX = 12;

const FACTOR_ROW_SHELL_CLASS =
  "rounded-md border border-[color:var(--cab-border)] px-2.5 py-2 motion-safe:shadow-[var(--cab-shadow-sm)]";

const FACTOR_ROW_TONE_CLASS = {
  up: "border-l-[3px] border-l-emerald-500 bg-[color:color-mix(in_srgb,#10b981_8%,var(--cab-card))]",
  down: "border-l-[3px] border-l-red-500 bg-[color:color-mix(in_srgb,#ef4444_7%,var(--cab-card))]",
} as const;

const FACTOR_BADGE_CLASS = {
  up: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  down: "bg-red-500/15 text-red-800 dark:text-red-300",
} as const;

const HEALTH_SCORE_CARD_GRID = "grid min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4";

function HealthScoreCard({
  title,
  children,
  className = "",
  headerAction,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}) {
  return (
    <article className={`${reportMetricCardCompactClass} flex min-w-0 flex-col sm:h-full sm:min-h-0 ${className}`.trim()}>
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] pb-2">
        <h3 className="min-w-0 text-sm font-semibold text-[color:var(--cab-text)]">{title}</h3>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="mt-2 flex min-w-0 flex-1 flex-col sm:min-h-0">{children}</div>
    </article>
  );
}

function HealthScoreCardSkeleton({ title, className = "" }: { title: string; className?: string }) {
  return (
    <article
      className={`${reportMetricCardCompactClass} flex min-h-0 min-w-0 flex-col ${className}`.trim()}
      aria-hidden
    >
      <div className={`h-4 w-32 border-b border-[color:var(--cab-border)] pb-2 ${dsSkeletonPulse}`} />
      <div className="mt-3 space-y-2">
        <div className={`h-3 w-full ${dsSkeletonPulse}`} />
        <div className={`h-3 w-5/6 ${dsSkeletonPulse}`} />
        <div className={`h-3 w-2/3 ${dsSkeletonPulse}`} />
      </div>
    </article>
  );
}

function FactorList({
  title,
  factors,
  tone,
  hideTitle = false,
}: {
  title: string;
  factors: OperationalHealthFactor[];
  tone: "up" | "down";
  hideTitle?: boolean;
}) {
  if (factors.length === 0) return null;

  return (
    <div className="min-w-0">
      {hideTitle ? null : (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</p>
      )}
      <ul className={hideTitle ? "flex flex-col gap-2" : "mt-1.5 flex flex-col gap-2"}>
        {factors.slice(0, FACTOR_LIST_MAX).map((factor) => {
          const row = (
            <div className={`${FACTOR_ROW_SHELL_CLASS} ${FACTOR_ROW_TONE_CLASS[tone]}`}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-[color:var(--cab-text)]">{factor.label}</p>
                  {factor.detail ? (
                    <p className="mt-1.5 min-w-0 text-[10px] leading-snug tabular-nums text-[color:var(--cab-text-muted)]">
                      {factor.detail}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex size-[2.75rem] shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] text-base font-extrabold leading-none tabular-nums shadow-[var(--cab-shadow-sm)] ${FACTOR_BADGE_CLASS[tone]}`}
                >
                  {formatImpact(factor.impact)}
                </span>
              </div>
            </div>
          );

          return (
            <li key={`${tone}-${factor.label}`} className="list-none min-w-0">
              {factor.href ? (
                <Link
                  href={factor.href}
                  className="block min-w-0 rounded-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cab-primary)]"
                  aria-label={`Vai alla fonte: ${factor.label}`}
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HealthScoreSynthesisIntro({
  calc,
  withTitle = false,
}: {
  calc: NonNullable<OperationalHealthScore["calculation"]>;
  withTitle?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      {withTitle ? (
        <h4 className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">Target di riferimento</h4>
      ) : null}
      <p className={dsTypoCaption}>
        Punteggio calcolato con confronto mese precedente e target officina.
      </p>
      <p className={`${dsTypoCaption} mt-1`}>
        Affidabilità {calc.confidencePct}% · qualità dati {calc.dataQualityPct}%.
      </p>
    </div>
  );
}

function HealthScoreSynthesisCard({ calc }: { calc: NonNullable<OperationalHealthScore["calculation"]> }) {
  const [targetsOpen, setTargetsOpen] = useState(false);
  const { canManageSettings } = usePermissions();
  const visibleAreaLabels = calc.sections.map((section) => section.label);
  const targetsActionLabel = canManageSettings ? "Modifica target officina" : "Vedi target officina";

  return (
    <>
      <HealthScoreCard title="Sintesi calcolo">
        <div className="flex min-h-0 flex-1 flex-col">
          <HealthScoreSynthesisBody calc={calc} />
          <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-[color:color-mix(in_srgb,var(--cab-border)_70%,transparent)] pt-3">
            <HealthScoreSynthesisIntro calc={calc} withTitle />
            <IconActionButton
              type="button"
              label={targetsActionLabel}
              className={`${dsTableActionBtnSecondary} shrink-0`}
              onClick={() => setTargetsOpen(true)}
            >
              <HubIconPencil className={dsTableActionGlyph} />
            </IconActionButton>
          </div>
        </div>
      </HealthScoreCard>
      <HealthScoreTargetsDialog
        open={targetsOpen}
        onClose={() => setTargetsOpen(false)}
        workshopSize={calc.workshopSize ?? "media"}
        workshopSizeLabel={calc.workshopSizeLabel}
        visibleAreaLabels={visibleAreaLabels}
      />
    </>
  );
}

function HealthScoreBriefMetricRow({
  label,
  value,
  suffix,
  valueClassName = "text-[color:var(--cab-text)]",
  prevScore,
  prevSuffix,
  deltaPoints,
  deltaPct,
  hint,
}: {
  label: string;
  value: string | number;
  suffix?: ReactNode;
  valueClassName?: string;
  prevScore?: number | null;
  prevSuffix?: ReactNode;
  deltaPoints?: number | null;
  deltaPct?: number | null;
  hint?: string;
}) {
  const showCompare = prevScore != null;

  return (
    <li className="min-w-0 border-b border-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-sm font-medium leading-snug text-[color:var(--cab-text)]">{label}</p>
      <div className="mt-1 flex min-w-0 items-end justify-between gap-3">
        <span
          className={`text-2xl font-semibold leading-none tabular-nums tracking-tight ${valueClassName}`}
        >
          {value}
          {suffix}
        </span>
        {showCompare ? <HealthScoreCompareBadge deltaPct={deltaPct ?? null} deltaPoints={deltaPoints ?? null} /> : null}
      </div>
      {showCompare ? (
        <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          Periodo precedente:{" "}
          <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">
            {prevScore}
            {prevSuffix}
          </span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 whitespace-nowrap text-xs leading-snug text-[color:var(--cab-text-muted)]">{hint}</p>
      ) : null}
    </li>
  );
}

function HealthScoreSynthesisBody({ calc }: { calc: NonNullable<OperationalHealthScore["calculation"]> }) {
  return (
    <>
      <ul className="mt-1 min-w-0 flex-1">
        <HealthScoreBriefMetricRow
          label="Media aree"
          value={calc.baseScore}
          suffix={<span className="text-xs font-semibold text-[color:var(--cab-text-muted)]">/100</span>}
          prevScore={calc.baseScorePrev}
          prevSuffix={<span className="text-[color:var(--cab-text-muted)]">/100</span>}
          deltaPoints={calc.baseScoreDeltaPoints}
          deltaPct={calc.baseScoreDeltaPct}
        />
        {calc.riskPenalty > 0 ? (
          <HealthScoreBriefMetricRow
            label="Penalità rischio"
            value={`−${calc.riskPenalty}`}
            valueClassName="text-[color:var(--cab-danger)]"
            hint="Sullo stato attuale dell'officina."
          />
        ) : null}
        <HealthScoreBriefMetricRow
          label="Totale"
          value={calc.smoothedScore}
          suffix={<span className="text-xs font-semibold text-[color:var(--cab-text-muted)]">/100</span>}
          prevScore={calc.scoreRawPrev}
          prevSuffix={<span className="text-[color:var(--cab-text-muted)]">/100</span>}
          deltaPoints={calc.smoothedScoreDeltaPoints}
          deltaPct={calc.smoothedScoreDeltaPct}
        />
      </ul>
      {calc.scoreRaw !== calc.smoothedScore ? (
        <p className={`${dsTypoCaption} mt-2 shrink-0`}>
          Grezzo {calc.scoreRaw}/100
          {calc.scoreRawPrev != null ? (
            <>
              {" · "}
              <span className="text-[color:var(--cab-text-muted)]">
                precedente {calc.scoreRawPrev}/100
              </span>
            </>
          ) : null}
        </p>
      ) : null}
    </>
  );
}

function fmtSectionDeltaPct(deltaPct: number | null): string | null {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return null;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function HealthScoreCompareBadge({
  deltaPct,
  deltaPoints,
}: {
  deltaPct: number | null;
  deltaPoints: number | null;
}) {
  const pctStr = fmtSectionDeltaPct(deltaPct);
  const { arrow, tone } = reportArrowAndTone(deltaPct, false);
  const absStr =
    deltaPoints != null ? `${deltaPoints > 0 ? "+" : ""}${deltaPoints} pt` : null;
  if (absStr == null && pctStr == null) return null;

  return (
    <Tooltip content="Variazione rispetto al periodo precedente">
      <span className={reportCompareBadgeClass(tone)}>
        <span className="text-xs leading-none" aria-hidden>
          {arrow}
        </span>
        {absStr ? <span>{absStr}</span> : null}
        {pctStr ? <span className={absStr ? "font-normal opacity-90" : undefined}>{pctStr}</span> : null}
      </span>
    </Tooltip>
  );
}

/** Stesso schema righe del brief settimanale KPI header. */
function HealthScoreSectionBriefRow({ section }: { section: OperationalHealthSectionSummary }) {
  return (
    <HealthScoreBriefMetricRow
      label={section.label}
      value={section.score}
      suffix={<span className="text-xs font-semibold text-[color:var(--cab-text-muted)]">/100</span>}
      prevScore={section.prevScore}
      prevSuffix={<span className="text-[color:var(--cab-text-muted)]">/100</span>}
      deltaPoints={section.deltaPoints}
      deltaPct={section.deltaPct}
    />
  );
}

function HealthScoreSectionsBody({
  sections,
}: {
  sections: NonNullable<OperationalHealthScore["calculation"]>["sections"];
}) {
  if (sections.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna area disponibile.</p>;
  }

  return (
    <ul className="mt-1 min-w-0 flex-1">
      {sections.map((section) => (
        <HealthScoreSectionBriefRow key={section.label} section={section} />
      ))}
    </ul>
  );
}

function HealthScoreCalculationSummary({ score }: { score: OperationalHealthScore }) {
  const calc = score.calculation;
  if (!calc) return null;

  return (
    <>
      <HealthScoreSynthesisBody calc={calc} />
      <div className="mt-3">
        <HealthScoreSynthesisIntro calc={calc} withTitle />
      </div>
    </>
  );
}

export function HealthScoreSummarySkeleton() {
  return (
    <HealthScoreLayout
      ring={<HealthScoreRingLoading />}
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

export function HealthScoreBreakdownBody({
  score,
  historyPoints,
  historyLoading,
}: {
  score: OperationalHealthScore;
  historyPoints?: HealthScoreWeeklyTrendPoint[] | null;
  historyLoading?: boolean;
}) {
  return (
    <HealthScoreBreakdownPanel
      score={score}
      historyPoints={historyPoints}
      historyLoading={historyLoading ?? false}
    />
  );
}

function HealthScoreBreakdownTextColumn({ score }: { score: OperationalHealthScore }) {
  const calc = score.calculation;
  const { positive, negative } = splitHealthFactors(score.factors.filter((f) => f.impact !== 0));

  return (
    <>
      {calc && calc.sections.length > 0 ? (
        <HealthScoreCard title="Punteggio per area">
          <HealthScoreSectionsBody sections={calc.sections} />
        </HealthScoreCard>
      ) : null}
      {calc ? (
        <HealthScoreSynthesisCard calc={calc} />
      ) : null}
      {positive.length > 0 ? (
        <HealthScoreCard title="Ha alzato il punteggio" className="sm:col-span-2">
          <FactorList title="Ha alzato il punteggio" factors={positive} tone="up" hideTitle />
        </HealthScoreCard>
      ) : null}
      {negative.length > 0 ? (
        <HealthScoreCard title="Ha abbassato il punteggio" className="sm:col-span-2">
          <FactorList title="Ha abbassato il punteggio" factors={negative} tone="down" hideTitle />
        </HealthScoreCard>
      ) : null}
      {positive.length === 0 && negative.length === 0 ? (
        <HealthScoreCard title="Variazioni" className="sm:col-span-2">
          <p className="text-sm leading-snug text-[color:var(--cab-text-muted)]">
            Nessuna variazione rilevante rispetto al periodo precedente.
          </p>
        </HealthScoreCard>
      ) : null}
    </>
  );
}

export function HealthScoreBreakdownPanel({
  score,
  historyPoints,
  historyLoading,
  insufficientMessage,
}: {
  score?: OperationalHealthScore | null;
  historyPoints?: HealthScoreWeeklyTrendPoint[] | null;
  historyLoading: boolean;
  insufficientMessage?: ReactNode;
}) {
  return (
    <div className={HEALTH_SCORE_CARD_GRID}>
      {insufficientMessage ? (
        <HealthScoreCard title="Stato operativo" className="sm:col-span-2">
          {insufficientMessage}
        </HealthScoreCard>
      ) : null}

      <HealthScoreCard title="Andamento settimanale" className="min-h-40 sm:col-span-2 xl:min-h-0">
        <HealthScoreWeeklyTrendChart
          points={historyPoints}
          isLoading={historyLoading}
          embedded
          hideTitle
        />
      </HealthScoreCard>

      {score ? <HealthScoreBreakdownTextColumn score={score} /> : null}

      {!score && !insufficientMessage ? (
        <>
          <HealthScoreCardSkeleton title="Sintesi" />
          <HealthScoreCardSkeleton title="Aree" />
          <HealthScoreCardSkeleton title="Fattori" className="sm:col-span-2" />
        </>
      ) : null}
    </div>
  );
}
