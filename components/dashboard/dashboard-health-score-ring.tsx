"use client";

import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { GestionaleCollapsibleChevronIcon } from "@/components/design-system/gestionale-collapsible-chevron";
import { CloseButton } from "@/components/design-system/close-button";
import type {
  OperationalHealthFactor,
  OperationalHealthScore,
  OperationalHealthTone,
} from "@/lib/dashboard/operational-health-score";
import { splitHealthFactors } from "@/lib/dashboard/operational-health-score";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { dsFocus, dsSkeletonPulse, dsTypoCaption } from "@/lib/ui/design-system";
import { globalDropdownPortalEnterClass } from "@/lib/ui/global-input";
import { GLOBAL_DROPDOWN_PORTAL_Z } from "@/lib/ui/global-dropdown-portal";

const HEALTH_SCORE_PANEL_WIDTH = 408;
const HEALTH_SCORE_PANEL_MAX_HEIGHT = 500;

const HEALTH_SCORE_PANEL_CLASS = [
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)]",
  "shadow-[var(--cab-shadow-lg),0_18px_52px_color-mix(in_srgb,#000_30%,transparent),0_4px_14px_color-mix(in_srgb,#000_18%,transparent)]",
  "gestionale-scrollbar overflow-y-auto",
  "origin-top",
  globalDropdownPortalEnterClass,
].join(" ");

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
  detailClassName,
  showDetail = true,
  detailOpen = false,
}: {
  title: string;
  score?: number;
  label: string;
  labelColor?: string;
  detailClassName?: string;
  showDetail?: boolean;
  detailOpen?: boolean;
}) {
  return (
    <div className="min-w-0 shrink-0 text-left">
      <p className="text-[11px] font-semibold leading-none text-[color:var(--cab-text-muted)]">{title}</p>
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
      {showDetail ? (
        <span
          className={`${dsTypoCaption} mt-0.5 inline-flex items-center gap-1 text-[color:var(--cab-text-muted)] ${detailClassName ?? ""}`.trim()}
        >
          Dettaglio
          <GestionaleCollapsibleChevronIcon expanded={detailOpen} className="h-3.5 w-3.5 shrink-0" />
        </span>
      ) : null}
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

function HealthScoreBreakdownPanel({
  score,
  onClose,
}: {
  score: OperationalHealthScore;
  onClose: () => void;
}) {
  const { positive, negative } = splitHealthFactors(score.factors.filter((f) => f.impact !== 0));

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3 border-b border-[color:var(--cab-border)] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug text-[color:var(--cab-text)]">
            <span className="text-sm font-medium text-[color:var(--cab-text-muted)]">Stato operativo: </span>
            <span className="tabular-nums">{score.score}</span>
            <span className="text-base font-medium text-[color:var(--cab-text-muted)]">/100</span>
            <span className="ml-2" style={{ color: TONE_RING_COLOR[score.tone] }}>
              {score.label}
            </span>
          </p>
          <p className="mt-1 text-sm leading-snug text-[color:var(--cab-text-muted)]">{score.periodLabel}</p>
        </div>
        <CloseButton
          onClick={onClose}
          label="Chiudi dettaglio stato operativo"
          className="h-8 w-8 shrink-0 text-base max-md:min-h-8 max-md:min-w-8"
        />
      </div>
      <div className="space-y-3.5 p-4">
      <FactorList title="Ha alzato il punteggio" factors={positive} tone="up" />
      <FactorList title="Ha abbassato il punteggio" factors={negative} tone="down" />
      {positive.length === 0 && negative.length === 0 ? (
        <p className="text-sm leading-snug text-[color:var(--cab-text-muted)]">
          Nessuna variazione rilevante rispetto al periodo precedente.
        </p>
      ) : null}
      </div>
    </div>
  );
}

function HealthScoreMain({
  score,
  panelAnchorRef,
}: {
  score: OperationalHealthScore;
  panelAnchorRef?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const positionAnchorRef = panelAnchorRef ?? triggerRef;
  const toneColor = TONE_RING_COLOR[score.tone];

  const dismiss = useCallback(() => setOpen(false), []);
  useDropdownOutsideDismiss(open, positionAnchorRef, panelRef, dismiss);

  const { style, isPositioned, floatingRef, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef: positionAnchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: HEALTH_SCORE_PANEL_WIDTH,
    maxHeight: HEALTH_SCORE_PANEL_MAX_HEIGHT,
    repositionDeps: [score.score, score.factors.length, open],
  });

  const toggle = useCallback(() => setOpen((value) => !value), []);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={(node) => {
              floatingRef(node);
              panelRef.current = node;
            }}
            style={{ ...style, zIndex: GLOBAL_DROPDOWN_PORTAL_Z, visibility: isPositioned ? "visible" : "hidden" }}
            className={`${HEALTH_SCORE_PANEL_CLASS} ${placementOriginClass} pointer-events-auto`}
            role="dialog"
            aria-label="Dettaglio stato operativo"
          >
            <HealthScoreBreakdownPanel score={score} onClose={dismiss} />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${dsFocus} group w-full min-w-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left`}
        aria-label={`Stato operativo ${score.score} su 100, ${score.label}. ${score.periodLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <HealthScoreLayout
          ring={<HealthScoreRing score={score.score} tone={score.tone} glow={TONE_GLOW[score.tone]} />}
          text={
            <HealthScoreTextColumn
              title="Stato operativo"
              score={score.score}
              label={score.label}
              labelColor={toneColor}
              detailClassName="group-hover:text-[color:var(--cab-text)]"
              detailOpen={open}
            />
          }
        />
      </button>
      {panel}
    </>
  );
}

function HealthScoreShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full min-w-0 items-center justify-center">{children}</div>;
}

export function DashboardHealthScoreRing({
  score,
  isLoading,
  insufficientData,
  panelAnchorRef,
}: {
  score: OperationalHealthScore | null;
  isLoading: boolean;
  insufficientData: boolean;
  panelAnchorRef?: RefObject<HTMLElement | null>;
}) {
  if (isLoading) {
    return (
      <HealthScoreShell>
        <HealthScoreLayout
          ring={<div className={`h-[4.25rem] w-[4.25rem] shrink-0 rounded-full ${dsSkeletonPulse}`} aria-hidden />}
          text={
            <div className="min-w-0 shrink-0 space-y-2" aria-hidden>
              <div className={`h-3 w-20 ${dsSkeletonPulse}`} />
              <div className={`h-4 w-14 ${dsSkeletonPulse}`} />
              <div className={`h-3 w-12 ${dsSkeletonPulse} opacity-70`} />
            </div>
          }
        />
      </HealthScoreShell>
    );
  }

  if (insufficientData || !score) {
    return (
      <HealthScoreShell>
        <HealthScoreLayout
          ring={
            <div
              className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-card)] text-xs font-semibold text-[color:var(--cab-text-muted)]"
              aria-hidden
            >
              —
            </div>
          }
          text={
            <HealthScoreTextColumn title="Stato operativo" label="Dati insufficienti" showDetail={false} />
          }
        />
      </HealthScoreShell>
    );
  }

  return (
    <HealthScoreShell>
      <HealthScoreMain score={score} panelAnchorRef={panelAnchorRef} />
    </HealthScoreShell>
  );
}
