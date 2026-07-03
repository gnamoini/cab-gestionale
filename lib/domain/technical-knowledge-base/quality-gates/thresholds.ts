export type QualityGateThresholds = {
  maxCoverageDrop: number;
  maxOarDrop: number;
  minInterventi: number;
  minComponenti: number;
  maxThr: number;
};

export function loadQualityGateThresholds(): QualityGateThresholds {
  return {
    maxCoverageDrop: Number(process.env.TKB_GATE_MAX_COVERAGE_DROP ?? 0.1),
    maxOarDrop: Number(process.env.TKB_GATE_MAX_OAR_DROP ?? 0.15),
    minInterventi: Number(process.env.TKB_GATE_MIN_INTERVENTI ?? 1),
    minComponenti: Number(process.env.TKB_GATE_MIN_COMPONENTI ?? 1),
    maxThr: Number(process.env.TKB_GATE_MAX_THR ?? 0),
  };
}
