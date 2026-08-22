"use client";

import type {
  BusinessReport,
  BusinessReportDomainBrief,
  BusinessReportInsightItem,
} from "@/lib/report/business-report/types";
import { ReportMetricEnvelopeCard } from "@/components/report/bi-center/report-metric-envelope-card";
import { useOptionalReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ShellCard } from "@/components/gestionale/shell-card";

function InsightList({
  title,
  items,
}: {
  title: string;
  items: BusinessReportInsightItem[];
}) {
  const drill = useOptionalReportDrillDown();
  const periodCtx = useReportPeriodContext();
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => {
          const metricId = item.metricIds[0];
          const supported = metricId ? (drill?.isDrilldownSupported(metricId) ?? false) : false;
          return (
            <li key={item.id} className="rounded-md border border-[color:var(--cab-border)] p-3">
              <button
                type="button"
                className="text-left w-full"
                disabled={!supported}
                onClick={() => {
                  if (!drill || !metricId || !supported) return;
                  drill.openKpiDrillDown({
                    metricId,
                    period: buildAnalyticsPeriodFromContext(periodCtx),
                    compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
                  });
                }}
                data-testid="business-report-insight-item"
              >
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-sm text-[color:var(--cab-text-muted)] mt-1">{item.explanation}</p>
                {item.aiExplanation && <p className="text-sm mt-2 italic">{item.aiExplanation}</p>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MetricChangeList({
  title,
  items,
  tone,
}: {
  title: string;
  items: BusinessReportDomainBrief["improved"];
  tone: "positive" | "negative" | "neutral";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-700 dark:text-rose-400"
        : "text-[color:var(--cab-text-muted)]";
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${toneClass}`}>{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((m) => (
          <li key={m.metricId}>
            <span className="font-medium">{m.label}</span>
            {": "}
            {m.value}
            {m.deltaLabel ? <span className={`ml-1 ${toneClass}`}>({m.deltaLabel})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DomainBriefCard({ brief }: { brief: BusinessReportDomainBrief }) {
  return (
    <article
      className="rounded-md border border-[color:var(--cab-border)] p-3 space-y-3"
      data-testid={`business-report-domain-${brief.domainId}`}
    >
      <h4 className="text-sm font-semibold">{brief.title}</h4>
      <MetricChangeList title="Migliorato" items={brief.improved} tone="positive" />
      <MetricChangeList title="Peggiorato" items={brief.worsened} tone="negative" />
      <MetricChangeList title="Situazione attuale" items={brief.snapshots} tone="neutral" />
      {brief.watch.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-amber-700 dark:text-amber-400">
            Attenzione
          </p>
          <ul className="space-y-2 text-sm">
            {brief.watch.map((w) => (
              <li key={w.ruleKey}>
                <p className="font-medium">{w.title}</p>
                <p className="text-[color:var(--cab-text-muted)]">{w.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {brief.narrative && (
        <p className="text-sm text-[color:var(--cab-text-muted)] border-t border-[color:var(--cab-border)] pt-2 italic">
          {brief.narrative}
        </p>
      )}
    </article>
  );
}

export function BusinessReportDetail({ report }: { report: BusinessReport }) {
  const domainBriefs = report.domainBriefs ?? [];

  return (
    <div className="min-w-0 space-y-4" data-testid="business-report-detail">
      <ShellCard title="Dati di periodo">
        <p className="text-sm whitespace-pre-wrap">{report.executiveSummary}</p>
        <dl className="mt-3 grid gap-1 text-xs text-[color:var(--cab-text-muted)] sm:grid-cols-2">
          <div>
            <dt>Periodo</dt>
            <dd>
              {report.period.from} → {report.period.to}
            </dd>
          </div>
          <div>
            <dt>Confronto</dt>
            <dd>{report.compare?.mode ?? "none"}</dd>
          </div>
          <div>
            <dt>Generato</dt>
            <dd>{new Date(report.generatedAt).toLocaleString("it-IT")}</dd>
          </div>
          <div>
            <dt>Versione</dt>
            <dd>v{report.generationVersion}</dd>
          </div>
        </dl>
      </ShellCard>

      {domainBriefs.length > 0 && (
        <ShellCard title="Analisi per area">
          <p className="text-sm text-[color:var(--cab-text-muted)] mb-3">
            Confronto con il periodo precedente — miglioramenti, peggioramenti e segnali da monitorare per
            lavorazioni, operatori, ricambi, mezzi, clienti, preventivi e incassi.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {domainBriefs.map((brief) => (
              <DomainBriefCard key={brief.domainId} brief={brief} />
            ))}
          </div>
        </ShellCard>
      )}

      <ShellCard title="Key Metrics">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {report.kpis.slice(0, 9).map((env) => (
            <ReportMetricEnvelopeCard key={env.metricId} envelope={env} />
          ))}
        </div>
      </ShellCard>

      <ShellCard title="Insight deterministici">
        <div className="space-y-4">
          <InsightList title="Highlights" items={report.highlights} />
          <InsightList title="Concerns" items={report.concerns} />
          <InsightList title="Anomalies" items={report.anomalies} />
        </div>
      </ShellCard>

      <ShellCard title="Eventi e note operative">
          <ul className="space-y-2 text-sm">
            {(report.operationalContext?.events ?? report.events).map((event) => (
              <li key={event.id} className="rounded-md border border-[color:var(--cab-border)] p-3">
                <p className="font-medium">{event.headline}</p>
                <p className="text-xs text-[color:var(--cab-text-muted)]">Fonte: {event.source}</p>
              </li>
            ))}
            {(report.operationalContext?.correlations ?? []).map((c) => (
              <li key={c.id} className="rounded-md border border-dashed border-[color:var(--cab-border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  {c.association}
                </p>
                <p>{c.label}</p>
              </li>
            ))}
          </ul>
        </ShellCard>

      {report.aiStatus === "completed" && (
        <ShellCard title="Interpretazione AI">
          <p className="text-sm text-[color:var(--cab-text-muted)] mb-3">
            Spiegazioni narrative collegate agli insight verificati — non sostituiscono i dati sopra.
          </p>
          <ul className="space-y-2">
            {[...report.highlights, ...report.concerns, ...report.anomalies]
              .filter((item) => item.aiExplanation)
              .map((item) => (
                <li key={item.id} className="text-sm border-l-2 border-[color:var(--cab-accent)] pl-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-[color:var(--cab-text-muted)]">{item.aiExplanation}</p>
                </li>
              ))}
          </ul>
        </ShellCard>
      )}

      {report.decisions.length > 0 && (
        <ShellCard title="Decision Points">
          <p className="mb-2 text-xs text-[color:var(--cab-text-muted)]">
            Sintesi — gestione stato nel{" "}
            <a href="#bi-decisions" className="underline underline-offset-2">
              Decision Center
            </a>
            .
          </p>
          <ul className="space-y-2">
            {report.decisions.map((d, i) => (
              <li key={i} className="text-sm border-l-2 border-[color:var(--cab-accent)] pl-3">
                <p className="font-medium">{d.title}</p>
                <p className="text-[color:var(--cab-text-muted)]">{d.rationale}</p>
              </li>
            ))}
          </ul>
        </ShellCard>
      )}
    </div>
  );
}
