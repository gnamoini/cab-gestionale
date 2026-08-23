"use client";

import { useMemo } from "react";
import { useReportOperationalContextSummaryQuery } from "@/components/report/operational-context/use-report-operational-context-query";
import { useOptionalReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import type {
  ReportOperationalEvent,
  ReportOperationalEventSeverity,
} from "@/lib/report/operational-context/types";

const SEVERITY_META: Record<
  ReportOperationalEventSeverity,
  { label: string; accent: string; badge: string; surface: string }
> = {
  negative: {
    label: "Critico",
    accent: "bg-[color:var(--cab-danger)]",
    badge:
      "bg-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-card))] text-[color:var(--cab-danger)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_5%,var(--cab-card))]",
  },
  attention: {
    label: "Attenzione",
    accent: "bg-[color:var(--cab-warning)]",
    badge:
      "bg-[color:color-mix(in_srgb,var(--cab-warning)_14%,var(--cab-card))] text-[color:var(--cab-warning)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-warning)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_5%,var(--cab-card))]",
  },
  positive: {
    label: "Positivo",
    accent: "bg-[color:var(--cab-success)]",
    badge:
      "bg-[color:color-mix(in_srgb,var(--cab-success)_14%,var(--cab-card))] text-[color:var(--cab-success)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-success)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_5%,var(--cab-card))]",
  },
  neutral: {
    label: "Nota",
    accent: "bg-[color:var(--cab-primary)]",
    badge: "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text-muted)]",
    surface: "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_35%,var(--cab-card))]",
  },
};

function isTechnicalSummary(summary: string | undefined): boolean {
  if (!summary?.trim()) return false;
  return /^[A-Z][A-Z0-9_]+$/.test(summary.trim());
}

function ContextItem({
  event,
  onOpen,
}: {
  event: ReportOperationalEvent;
  onOpen?: () => void;
}) {
  const severity = event.severity ?? "neutral";
  const meta = SEVERITY_META[severity];
  const subtitle = isTechnicalSummary(event.summary) ? undefined : event.summary;

  return (
    <li
      className={`relative overflow-hidden rounded-lg border shadow-[var(--cab-shadow-sm)] ${meta.surface}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} aria-hidden />
      <div className="flex flex-col gap-3 p-3 pl-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}
          >
            {meta.label}
          </span>
          <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">{event.title}</p>
          {subtitle ? (
            <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {event.drillDown && onOpen ? (
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-xs font-medium text-[color:var(--cab-primary)] shadow-sm transition hover:bg-[color:var(--cab-surface-muted)]"
            onClick={onOpen}
          >
            Approfondisci
            <span className="ml-1" aria-hidden>
              →
            </span>
          </button>
        ) : null}
      </div>
    </li>
  );
}

/** Eventi operativi — dumb content, no shell. */
export function ReportOperationalContextEvents() {
  const { data, isLoading, isError } = useReportOperationalContextSummaryQuery(true);
  const drill = useOptionalReportDrillDown();
  const items = data?.summaryEvents ?? [];

  const visibleItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((event) => {
      const key = event.insightRuleKeys?.[0] ?? event.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  return (
    <div data-testid="report-operational-context-panel" className="min-w-0">
      {isLoading ? (
        <div className="grid gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-[color:var(--cab-danger)]">Contesto non disponibile</p>
      ) : visibleItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[color:var(--cab-border)] px-4 py-6 text-center text-sm text-[color:var(--cab-text-muted)]">
          Nessun segnale operativo rilevante nel periodo
        </p>
      ) : (
        <ul className="grid gap-2.5" aria-label="Contesto operativo">
          {visibleItems.map((event) => (
            <ContextItem
              key={event.id}
              event={event}
              onOpen={
                event.drillDown && drill
                  ? () => drill.openInsightDrillDown(event.drillDown!)
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** @deprecated Use area view orchestration */
export function ReportOperationalContextPanel() {
  return <ReportOperationalContextEvents />;
}
