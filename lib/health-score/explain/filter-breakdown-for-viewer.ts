import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type {
  HealthScoreBreakdown,
  HealthScoreTone,
  ModuleAccessMap,
  SectionExplainNode,
} from "@/lib/health-score/types";

const SCORE_LABELS: { min: number; label: string; tone: HealthScoreTone }[] = [
  { min: 80, label: "Ottimo", tone: "excellent" },
  { min: 60, label: "Buono", tone: "good" },
  { min: 40, label: "Attenzione", tone: "warn" },
  { min: 0, label: "Critico", tone: "critical" },
];

export function scoreLabelAndTone(score: number): { label: string; tone: HealthScoreTone } {
  const band = SCORE_LABELS.find((b) => score >= b.min) ?? SCORE_LABELS[SCORE_LABELS.length - 1]!;
  return { label: band.label, tone: band.tone };
}

const SECTION_MODULE_REQUIREMENTS: Record<string, GestionalePermissionModule[]> = {
  produzione: ["lavorazioni"],
  magazzino: ["magazzino"],
  personale: ["dipendenti"],
  economico: ["preventivi", "fatturazione"],
};

function canViewSection(sectionId: string, access: ModuleAccessMap): boolean {
  const reqs = SECTION_MODULE_REQUIREMENTS[sectionId];
  if (!reqs) return true;
  if (sectionId === "economico") {
    return reqs.some((m) => access[m]?.canRead === true);
  }
  return reqs.every((m) => access[m]?.canRead === true);
}

function canViewRisiko(access: ModuleAccessMap): boolean {
  return ["produzione", "magazzino", "personale"].some((s) => canViewSection(s, access));
}

export function filterBreakdownForViewer(
  breakdown: HealthScoreBreakdown,
  access: ModuleAccessMap,
): HealthScoreBreakdown {
  let redactedContributionPoints = 0;
  const sections: SectionExplainNode[] = [];

  for (const section of breakdown.sections) {
    if (!canViewSection(section.id, access)) {
      redactedContributionPoints += section.contributionPoints;
      sections.push({
        ...section,
        redacted: true,
        kpis: [],
        contributionPoints: 0,
      });
      continue;
    }
    sections.push(section);
  }

  const riskModifiers = canViewRisiko(access)
    ? breakdown.riskModifiers
    : breakdown.riskModifiers.map((r) => {
        redactedContributionPoints -= r.penalty;
        return { ...r, motivation: "Dettaglio non disponibile (permessi)" };
      });

  const redactedSummary =
    redactedContributionPoints !== 0
      ? `Altri fattori: ${redactedContributionPoints > 0 ? "+" : ""}${Math.round(redactedContributionPoints)} (dettaglio non disponibile)`
      : undefined;

  return {
    sections,
    riskModifiers,
    redactedContributionPoints,
    redactedSummary,
  };
}
