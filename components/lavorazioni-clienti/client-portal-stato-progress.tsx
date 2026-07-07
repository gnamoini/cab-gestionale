"use client";

import "./client-portal-stato-progress.css";

import { useMemo, useState, type CSSProperties } from "react";
import { Tooltip } from "@/components/design-system";
import { dsHubModalFieldLabel } from "@/lib/ui/design-system";
import {
  GestionaleCollapsibleChevronBox,
} from "@/components/design-system/gestionale-collapsible-chevron";
import {
  gestionaleCollapsiblePanelGridClass,
  gestionaleCollapsiblePanelInnerClass,
} from "@/lib/ui/gestionale-collapsible-toggle";
import {
  buildClientPortalStatoProgress,
  clientPortalStatoProgressFillPcts,
  clientPortalStatoStepPositionPct,
  enrichClientPortalStatoProgressWithTimeline,
} from "@/lib/lavorazioni/client-portal-stato-progress";
import { fmtClientTimelineWhen } from "@/lib/lavorazioni/client-portal-timeline";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { ClientTimelineEvent } from "@/lib/lavorazioni/client-portal-timeline";

export function ClientPortalStatoProgress({
  statiOpts,
  currentStatoId,
  currentLabel,
  timelineEvents = [],
}: {
  statiOpts: readonly { id: string; label: string; color?: string }[];
  currentStatoId: string;
  currentLabel: string;
  timelineEvents?: readonly ClientTimelineEvent[];
}) {
  const { steps, currentIndex } = useMemo(() => {
    const base = buildClientPortalStatoProgress(statiOpts, currentStatoId);
    return enrichClientPortalStatoProgressWithTimeline(base, timelineEvents);
  }, [statiOpts, currentStatoId, timelineEvents]);

  const { solidPct, leadPct } = clientPortalStatoProgressFillPcts(currentIndex, steps.length);
  const hasLeadSegment = leadPct > solidPct + 0.5;
  const filledPct = hasLeadSegment ? leadPct : solidPct;
  const isComplete = currentIndex >= steps.length - 1;
  const [phasesOpen, setPhasesOpen] = useState(false);

  const currentColor = readablePillStyleFromHex(steps[currentIndex]?.color).backgroundColor;
  const nextColor = steps[currentIndex + 1]
    ? readablePillStyleFromHex(steps[currentIndex + 1].color).backgroundColor
    : currentColor;

  if (!steps.length) {
    return <p className="text-sm font-semibold text-[color:var(--cab-text)]">{currentLabel}</p>;
  }

  const progressStyle = {
    ["--cpp-accent" as string]: currentColor ?? "var(--cab-primary)",
    ["--cpp-next" as string]: nextColor ?? currentColor ?? "var(--cab-primary)",
  } as CSSProperties;

  const fillClass = [
    "client-portal-stato-progress-fill",
    hasLeadSegment ? "client-portal-stato-progress-fill--tail" : "",
    isComplete ? "client-portal-stato-progress-fill--complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0" role="group" aria-label={`Avanzamento: ${currentLabel}`}>
      <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{currentLabel}</p>

      <div className="mt-3 py-2">
        <div className="relative mx-2.5 min-w-0 sm:mx-3" style={progressStyle}>
        <div className="client-portal-stato-progress-track" aria-hidden>
          {filledPct > 0 ? (
            <div className={fillClass} style={{ width: `${filledPct}%` }}>
              <div className="client-portal-stato-progress-body" aria-hidden />
              <div className="client-portal-stato-progress-shine" aria-hidden />
            </div>
          ) : null}
        </div>
        {steps.map((step, i) => {
          const leftPct = clientPortalStatoStepPositionPct(i, steps.length);
          const isCurrent = step.status === "current";
          const isDone = step.status === "done";
          const isUpcoming = step.status === "upcoming";
          const dotStyle = readablePillStyleFromHex(step.color);
          const dotClass = `client-portal-stato-progress-dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] ${
            isCurrent
              ? "client-portal-stato-progress-dot--current z-10 h-3.5 w-3.5"
              : isDone
                ? "client-portal-stato-progress-dot--done z-[2] h-2.5 w-2.5"
                : "client-portal-stato-progress-dot--upcoming z-[2] h-2.5 w-2.5"
          }`;
          const dotStyleInline = {
            left: `${leftPct}%`,
            backgroundColor: isUpcoming
              ? `color-mix(in srgb, ${dotStyle.backgroundColor ?? "var(--cab-border)"} 32%, var(--cab-surface-2))`
              : dotStyle.backgroundColor,
            ["--client-portal-dot-color" as string]: dotStyle.backgroundColor,
          } as CSSProperties;
          const tooltipContent = step.changedAt
            ? `${step.label} · ${fmtClientTimelineWhen(step.changedAt)}`
            : step.label;
          return (
            <Tooltip key={step.id} content={tooltipContent}>
              <button
                type="button"
                className={`${dotClass} touch-manipulation border-0 p-0 outline-none`}
                style={dotStyleInline}
                aria-label={step.label}
              />
            </Tooltip>
          );
        })}
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left touch-manipulation"
          onClick={() => setPhasesOpen((open) => !open)}
          aria-expanded={phasesOpen}
          aria-controls="client-portal-stato-phases"
        >
          <GestionaleCollapsibleChevronBox expanded={phasesOpen} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            Dettaglio fasi
          </span>
        </button>
        <div
          className={`${gestionaleCollapsiblePanelGridClass} ${phasesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className={`${gestionaleCollapsiblePanelInnerClass} ${phasesOpen ? "opacity-100" : "opacity-0"}`}>
            <ul id="client-portal-stato-phases" className="space-y-1.5 pt-1.5">
        {steps.map((step) => {
          const dotStyle =
            step.status === "upcoming"
              ? undefined
              : readablePillStyleFromHex(step.color);
          const whenLabel = step.changedAt ? fmtClientTimelineWhen(step.changedAt) : "—";
          return (
            <li key={step.id} className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] ${
                  step.status === "upcoming" ? "bg-[color:var(--cab-border)]" : ""
                }`}
                style={
                  step.status === "upcoming"
                    ? undefined
                    : { backgroundColor: dotStyle?.backgroundColor }
                }
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 truncate text-[11px] leading-snug ${
                  step.status === "current"
                    ? "font-semibold text-[color:var(--cab-text)]"
                    : step.status === "done"
                      ? "text-[color:var(--cab-text)]"
                      : "text-[color:var(--cab-text-muted)]"
                }`}
              >
                {step.label}
              </span>
              <time
                className="shrink-0 text-[10px] tabular-nums text-[color:var(--cab-text-muted)]"
                dateTime={step.changedAt}
              >
                {whenLabel}
              </time>
            </li>
          );
        })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tile panoramica portale: label + grafico avanzamento. */
export function ClientPortalStatoProgressTile({
  statiOpts,
  currentStatoId,
  currentLabel,
  timelineEvents = [],
  className = "",
}: {
  statiOpts: readonly { id: string; label: string; color?: string }[];
  currentStatoId: string;
  currentLabel: string;
  timelineEvents?: readonly ClientTimelineEvent[];
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] p-3${className ? ` ${className}` : ""}`}
    >
      <p className={dsHubModalFieldLabel}>Stato</p>
      <div className="mt-0.5 min-w-0">
        <ClientPortalStatoProgress
          statiOpts={statiOpts}
          currentStatoId={currentStatoId}
          currentLabel={currentLabel}
          timelineEvents={timelineEvents}
        />
      </div>
    </div>
  );
}
