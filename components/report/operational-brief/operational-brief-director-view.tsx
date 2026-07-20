"use client";

import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

const STATUS_LABEL: Record<OperationalBriefOutput["executiveSummary"]["status"], string> = {
  good: "Stabile",
  attention: "Attenzione",
  critical: "Critico",
};

const STATUS_CLASS: Record<OperationalBriefOutput["executiveSummary"]["status"], string> = {
  good: "text-[color:var(--cab-success)]",
  attention: "text-[color:var(--cab-warning)]",
  critical: "text-[color:var(--cab-danger)]",
};

const SCORE_STATUS_CLASS: Record<OperationalBriefOutput["briefScore"]["status"], string> = {
  green: "border-[color:color-mix(in_srgb,var(--cab-success)_40%,var(--cab-border))]",
  amber: "border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))]",
  red: "border-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))]",
};

export function OperationalBriefDirectorView({ brief }: { brief: OperationalBriefOutput }) {
  const problemCount = brief.topProblems.length;
  const winCount = brief.wins.length;
  const actionCount = brief.recommendedActions.length;

  return (
    <div className="min-w-0 space-y-4">
      <div
        className={`rounded-[var(--ds-radius-lg)] border bg-[var(--cab-card)] px-4 py-4 ${SCORE_STATUS_CLASS[brief.briefScore.status]}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Brief operativo · {brief.period.label}
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-lg font-semibold ${STATUS_CLASS[brief.executiveSummary.status]}`}>
              {STATUS_LABEL[brief.executiveSummary.status]}
            </p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--cab-text)]">
              {brief.briefScore.overall}
              <span className="text-sm font-normal text-[color:var(--cab-text-muted)]">/100</span>
            </p>
          </div>
          <p className="min-w-0 text-sm text-[color:var(--cab-text-muted)]">
            {problemCount} problemi · {winCount} miglioramenti · {actionCount} azioni
          </p>
        </div>
        <p className="mt-3 text-sm font-medium text-[color:var(--cab-text)]">{brief.executiveSummary.headline}</p>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
          {brief.executiveSummary.explanation}
        </p>
      </div>

      {brief.todayPriorities.length > 0 ? (
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            Priorità oggi
          </p>
          <ol className="min-w-0 list-decimal space-y-1.5 pl-4 text-sm text-[color:var(--cab-text)]">
            {brief.todayPriorities.map((p, i) => (
              <li key={`prio-${i}`}>{p.statement}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
