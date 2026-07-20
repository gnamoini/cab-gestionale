"use client";

import { ReportSubsection } from "@/components/report/sections/report-subsection";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

function ConfidenceBadge({ level }: { level: string }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
      Confidenza: {level}
    </span>
  );
}

export function OperationalBriefAnalystView({ brief }: { brief: OperationalBriefOutput }) {
  return (
    <div className="min-w-0 space-y-4">
      <ReportSubsection id="ob-score" title="Score per dominio" defaultCollapsed>
        <ul className="min-w-0 grid gap-2 sm:grid-cols-2">
          {Object.entries(brief.briefScore.domains).map(([key, domain]) => (
            <li
              key={key}
              className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2"
            >
              <p className="text-xs capitalize text-[color:var(--cab-text-muted)]">{key}</p>
              <p className="text-sm font-semibold text-[color:var(--cab-text)]">
                {domain.score}/100{" "}
                <span className="text-xs font-normal text-[color:var(--cab-text-muted)]">({domain.trend})</span>
              </p>
            </li>
          ))}
        </ul>
        {brief.briefScore.reasons.length > 0 ? (
          <ul className="mt-3 min-w-0 space-y-1 text-xs text-[color:var(--cab-text-muted)]">
            {brief.briefScore.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        ) : null}
      </ReportSubsection>

      {brief.topProblems.length > 0 ? (
        <ReportSubsection id="ob-problems" title="Problemi" defaultCollapsed>
          <ul className="min-w-0 space-y-2">
            {brief.topProblems.map((p, i) => (
              <li
                key={`prob-${i}`}
                className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5"
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm text-[color:var(--cab-text)]">{p.statement}</p>
                  <ConfidenceBadge level={p.confidence} />
                </div>
              </li>
            ))}
          </ul>
        </ReportSubsection>
      ) : null}

      {brief.wins.length > 0 ? (
        <ReportSubsection id="ob-wins" title="Miglioramenti" defaultCollapsed>
          <ul className="min-w-0 space-y-2">
            {brief.wins.map((w, i) => (
              <li key={`win-${i}`} className="text-sm text-[color:var(--cab-text)]">
                {w.statement}
              </li>
            ))}
          </ul>
        </ReportSubsection>
      ) : null}

      {brief.events.length > 0 ? (
        <ReportSubsection id="ob-events" title="Eventi" defaultCollapsed>
          <ul className="min-w-0 space-y-2">
            {brief.events.map((e) => (
              <li key={e.id} className="text-sm text-[color:var(--cab-text)]">
                <span className="text-xs uppercase text-[color:var(--cab-text-muted)]">[{e.type}]</span> {e.headline}
              </li>
            ))}
          </ul>
        </ReportSubsection>
      ) : null}

      {brief.recommendedActions.length > 0 ? (
        <ReportSubsection id="ob-actions" title="Azioni consigliate" defaultCollapsed>
          <ul className="min-w-0 space-y-2">
            {brief.recommendedActions.map((a, i) => (
              <li
                key={`act-${i}`}
                className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_4%,var(--cab-card))] px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-[color:var(--cab-text)]">
                  [{a.priority}] {a.action}
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{a.problem}</p>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Impatto: {a.impact}</p>
              </li>
            ))}
          </ul>
        </ReportSubsection>
      ) : null}

      {brief.qualitativeContextUsed.length > 0 ? (
        <ReportSubsection id="ob-diary" title="Note operative considerate" defaultCollapsed>
          <ul className="min-w-0 space-y-2">
            {brief.qualitativeContextUsed.map((d, i) => (
              <li key={`diary-${i}`} className="text-xs text-[color:var(--cab-text-muted)]">
                <span className="font-medium text-[color:var(--cab-text)]">{d.workDate}</span> [{d.category}]{" "}
                {d.text}
              </li>
            ))}
          </ul>
        </ReportSubsection>
      ) : null}

      <ReportSubsection id="ob-domains" title="Analisi per dominio" defaultCollapsed>
        <div className="min-w-0 space-y-3">
          {Object.entries(brief.domainAnalysis).map(([key, domain]) => (
            <div key={key}>
              <p className="text-xs font-semibold capitalize text-[color:var(--cab-text)]">{key}</p>
              <p className="text-sm text-[color:var(--cab-text-muted)]">{domain.summary || "—"}</p>
            </div>
          ))}
        </div>
      </ReportSubsection>
    </div>
  );
}
