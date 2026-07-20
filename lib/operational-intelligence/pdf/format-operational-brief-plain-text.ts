import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

export function formatOperationalBriefPlainText(brief: OperationalBriefOutput): string {
  const lines: string[] = [
    `BRIEF OPERATIVO — ${brief.period.label}`,
    `Score: ${brief.briefScore.overall}/100 (${brief.briefScore.status})`,
    "",
    brief.executiveSummary.headline,
    brief.executiveSummary.explanation,
    "",
    "PRIORITÀ OGGI:",
    ...brief.todayPriorities.map((p, i) => `${i + 1}. ${p.statement}`),
    "",
    "PROBLEMI:",
    ...brief.topProblems.map((p) => `- ${p.statement}`),
    "",
    "MIGLIORAMENTI:",
    ...brief.wins.map((p) => `- ${p.statement}`),
    "",
    "AZIONI:",
    ...brief.recommendedActions.map((a) => `[${a.priority}] ${a.action} — ${a.problem}`),
    "",
    brief.disclaimer,
  ];
  return lines.join("\n");
}
