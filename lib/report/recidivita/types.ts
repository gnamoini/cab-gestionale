import type { OperatorConfidence } from "@/lib/report/recidivita/resolve-operator-identity";

export type RecidivitaWindowDays = 30 | 90 | 365;

export type RecidivitaScoreBreakdown = {
  temporal: number;
  component: number;
  symptom: number;
  composite: number;
};

export type OperatorIdentity = {
  storedName: string;
  addettoId: string | null;
  confidence: OperatorConfidence;
};

export type DataQualityAuditResult = {
  totalEpisodes: number;
  withoutMezzoId: number;
  withoutMezzoIdPct: number;
  closedWithoutUscita: number;
  closedWithoutUscitaPct: number;
  withoutIngressoScheda: number;
  withoutIngressoSchedaPct: number;
  operatorResolvable: number;
  operatorResolvablePct: number;
  ricambiRowsWithMovement: number;
  ricambiRowsTotal: number;
  ricambiWithMovementPct: number;
  warnings: string[];
};

export type FleetRecidivitaKpi = {
  mezziAnalizzati: number;
  ingressiTotali: number;
  ritorniWindow: number;
  indiceRecidivitaPct: number;
  costoRitorni: number;
  orePerse: number;
  operatorAttributionPrecisionPct: number;
};

export type RecidivaMezzoRankRow = {
  mezzoId: string;
  mezzo: string;
  cliente: string;
  interventi: number;
  ritorni: number;
  recidivitaScore: number;
  ultimoIntervento: string;
  giorniDaPrecedente: number | null;
  breakdown: RecidivitaScoreBreakdown;
};

export type QualitaInterventiSegmentRow = {
  segmentKey: string;
  segmentLabel: string;
  interventi: number;
  ritorni: number;
  returnRate: number;
  riskIndex: number;
  complexityFactor: number;
  vsOfficinaPct: number;
};
