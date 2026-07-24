export { auditDataQuality, DATA_QUALITY_THRESHOLDS } from "@/lib/report/recidivita/data-quality-audit";
export { computeRecidivitaScore, RECIDIVITA_WEIGHTS } from "@/lib/report/recidivita/recidivita-score";
export {
  buildFleetRecidivitaKpi,
  countIngressiByMonth,
  listRecidivaMezziRanked,
} from "@/lib/report/recidivita/recidivita-selectors";
export {
  buildQualitaInterventiByComponente,
  buildQualitaInterventiByOperatore,
} from "@/lib/report/recidivita/qualita-interventi";
export {
  computeOperatorAttributionPrecision,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
export type { RecidivitaWindowDays } from "@/lib/report/recidivita/types";
