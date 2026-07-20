import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

/** ponytail: Q&A deterministico su brief — upgrade path: LLM con storico P3+ */
export function answerOperationalBriefQuestion(
  question: string,
  brief: OperationalBriefOutput,
  previousBrief?: OperationalBriefOutput | null,
): { answer: string; confidence: "high" | "medium" | "low"; evidence: string[] } {
  const q = question.toLowerCase().trim();
  const evidence: string[] = [];

  if (q.includes("peggior") || q.includes("worse") || q.includes("calo")) {
    if (previousBrief) {
      const delta = brief.briefScore.overall - previousBrief.briefScore.overall;
      evidence.push(`Score attuale: ${brief.briefScore.overall}, precedente: ${previousBrief.briefScore.overall}`);
      if (delta < 0) {
        return {
          answer: `Il punteggio è sceso di ${Math.abs(delta)} punti (${previousBrief.briefScore.overall} → ${brief.briefScore.overall}). Motivi: ${brief.briefScore.reasons.join("; ") || "vedi problemi nel brief"}.`,
          confidence: "high",
          evidence,
        };
      }
      return {
        answer: `Il punteggio non è peggiorato rispetto al periodo precedente (${delta >= 0 ? "+" : ""}${delta} punti).`,
        confidence: "high",
        evidence,
      };
    }
    return {
      answer: `Stato attuale: ${brief.briefScore.overall}/100 (${brief.briefScore.status}). ${brief.executiveSummary.explanation}`,
      confidence: "medium",
      evidence: brief.briefScore.reasons,
    };
  }

  if (q.includes("mezzi") || q.includes("controllare") || q.includes("domani")) {
    const priorities = brief.todayPriorities.map((p) => p.statement).join("; ");
    const compliance = brief.events.filter((e) => e.headline.toLowerCase().includes("revision") || e.headline.toLowerCase().includes("tagliand"));
    if (compliance.length > 0) {
      evidence.push(...compliance.map((e) => e.headline));
    }
    return {
      answer: priorities
        ? `Priorità indicate nel brief: ${priorities}`
        : `Nessuna priorità mezzi esplicita. Controllare: ${brief.topProblems.map((p) => p.statement).join("; ") || "nessun problema critico"}.`,
      confidence: priorities ? "high" : "medium",
      evidence,
    };
  }

  if (q.includes("perché") || q.includes("why")) {
    return {
      answer: `${brief.executiveSummary.headline}. ${brief.executiveSummary.explanation}`,
      confidence: brief.executiveSummary.confidence,
      evidence: brief.briefScore.reasons,
    };
  }

  return {
    answer: `${brief.executiveSummary.headline}. Score ${brief.briefScore.overall}/100. Problemi principali: ${brief.topProblems.map((p) => p.statement).join("; ") || "nessuno"}.`,
    confidence: "medium",
    evidence: brief.briefScore.reasons,
  };
}
