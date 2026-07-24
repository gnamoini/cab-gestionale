import { componentOverlapScore, extractComponentsFromBundle } from "@/lib/report/recidivita/component-match";
import { symptomMatchScore } from "@/lib/report/recidivita/symptom-match";
import type { RecidivitaScoreBreakdown } from "@/lib/report/recidivita/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export const RECIDIVITA_WEIGHTS = {
  temporal: 0.3,
  component: 0.4,
  symptom: 0.3,
} as const;

export type RecidivitaEpisodeInput = {
  dataIngresso: string;
  dataCompletamento: string;
  bundle: LavorazioneSchedeBundle | null | undefined;
};

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (b - a) / 86400000);
}

export function temporalRecidivitaScore(
  prev: RecidivitaEpisodeInput,
  next: RecidivitaEpisodeInput,
  windowDays: number,
): number {
  const gap = daysBetween(prev.dataCompletamento, next.dataIngresso);
  if (!Number.isFinite(gap) || gap > windowDays) return 0;
  return Math.max(0, 1 - gap / windowDays);
}

export function computeRecidivitaScore(
  prev: RecidivitaEpisodeInput,
  next: RecidivitaEpisodeInput,
  windowDays: number,
): RecidivitaScoreBreakdown {
  const temporal = temporalRecidivitaScore(prev, next, windowDays);

  const prevSymptom =
    prev.bundle?.ingresso?.campi.descrizioneAnomalia?.trim() ||
    prev.bundle?.ingresso?.campi.noteIntervento?.trim() ||
    "";
  const nextSymptom =
    next.bundle?.ingresso?.campi.descrizioneAnomalia?.trim() ||
    next.bundle?.ingresso?.campi.noteIntervento?.trim() ||
    "";
  const symptom = temporal > 0 ? symptomMatchScore(prevSymptom, nextSymptom) : 0;

  const prevComponents = extractComponentsFromBundle(prev.bundle);
  const nextComponents = extractComponentsFromBundle(next.bundle);
  const component = temporal > 0 ? componentOverlapScore(prevComponents, nextComponents) : 0;

  const composite =
    RECIDIVITA_WEIGHTS.temporal * temporal +
    RECIDIVITA_WEIGHTS.component * component +
    RECIDIVITA_WEIGHTS.symptom * symptom;

  return {
    temporal: Math.round(temporal * 1000) / 1000,
    component: Math.round(component * 1000) / 1000,
    symptom: Math.round(symptom * 1000) / 1000,
    composite: Math.round(composite * 1000) / 1000,
  };
}

export function maxRecidivitaScoreBetween(
  episodes: readonly RecidivitaEpisodeInput[],
  windowDays: number,
): RecidivitaScoreBreakdown {
  let best: RecidivitaScoreBreakdown = { temporal: 0, component: 0, symptom: 0, composite: 0 };
  for (let i = 1; i < episodes.length; i++) {
    const prev = episodes[i - 1]!;
    const next = episodes[i]!;
    const score = computeRecidivitaScore(prev, next, windowDays);
    if (score.composite > best.composite) best = score;
  }
  return best;
}
