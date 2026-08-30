"use client";

import type { InsightDto, InsightSeverity } from "@/lib/report/insights/types";
import {
  isValidInsightDrillDownSection,
  resolveInsightDrillDownElementId,
  resolveInsightDrillDownHref,
} from "@/components/report/insight-strip/insight-drill-down-nav";
import { useReportSectionVisibility } from "@/components/report/layout/report-section-visibility-context";
import { REPORT_SECTIONS } from "@/components/report/report-sections-config";

const SEVERITY_META: Record<
  InsightSeverity,
  { label: string; accent: string; badge: string; surface: string }
> = {
  critical: {
    label: "Critico",
    accent: "bg-[color:var(--cab-danger)]",
    badge:
      "bg-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-card))] text-[color:var(--cab-danger)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_5%,var(--cab-card))]",
  },
  warning: {
    label: "Attenzione",
    accent: "bg-[color:var(--cab-warning)]",
    badge:
      "bg-[color:color-mix(in_srgb,var(--cab-warning)_14%,var(--cab-card))] text-[color:var(--cab-warning)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-warning)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_5%,var(--cab-card))]",
  },
  info: {
    label: "Info",
    accent: "bg-[color:var(--cab-primary)]",
    badge: "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text-muted)]",
    surface: "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_35%,var(--cab-card))]",
  },
};

function drillDownCtaLabel(targetSection: string): string {
  const section = REPORT_SECTIONS.find((s) => s.id === targetSection);
  if (!section) return "Approfondisci";
  const title = section.title.charAt(0) + section.title.slice(1).toLowerCase();
  return `Apri ${title}`;
}

type InsightStripProps = {
  insights: InsightDto[] | null;
  loading: boolean;
  error: string | null;
};

function InsightStripItem({ insight }: { insight: InsightDto }) {
  const { setOpen } = useReportSectionVisibility();
  const { drillDown } = insight;
  const canNavigate = isValidInsightDrillDownSection(drillDown.targetSection);
  const href = canNavigate ? resolveInsightDrillDownHref(drillDown) : undefined;
  const meta = SEVERITY_META[insight.severity];

  const handleNavigate = () => {
    if (!isValidInsightDrillDownSection(drillDown.targetSection)) return;
    const section = drillDown.targetSection;
    setOpen(section, true);
    const el = document.getElementById(resolveInsightDrillDownElementId(drillDown));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <li
      className={`relative overflow-hidden rounded-lg border shadow-[var(--cab-shadow-sm)] ${meta.surface}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} aria-hidden />
      <div className="flex flex-col gap-3 p-3 pl-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
              {meta.label}
            </span>
            {insight.trust === "AMBER" ? (
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-card))] px-2 py-0.5 text-[10px] font-medium text-[color:var(--cab-warning)]">
                Dato parziale
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">{insight.message}</p>
        </div>
        {canNavigate ? (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              handleNavigate();
            }}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-xs font-medium text-[color:var(--cab-primary)] shadow-sm transition hover:bg-[color:var(--cab-surface-muted)]"
          >
            {drillDownCtaLabel(drillDown.targetSection)}
            <span className="ml-1" aria-hidden>
              →
            </span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function InsightStrip({ insights, loading, error }: InsightStripProps) {
  if (loading) {
    return (
      <div className="grid gap-2.5 lg:grid-cols-2" aria-busy="true" aria-label="Caricamento insight">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-[color:var(--cab-danger)]">{error}</p>;
  }

  if (!insights?.length) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--cab-border)] px-4 py-6 text-center text-sm text-[color:var(--cab-text-muted)]">
        Nessun insight per il periodo selezionato.
      </p>
    );
  }

  return (
    <ul className="grid gap-2.5 lg:grid-cols-2" aria-label="Insight analitici">
      {insights.map((insight) => (
        <InsightStripItem key={`${insight.ruleKey}:${insight.ruleVersion}`} insight={insight} />
      ))}
    </ul>
  );
}
