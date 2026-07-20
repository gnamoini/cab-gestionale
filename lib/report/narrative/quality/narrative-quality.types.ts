export type NarrativeClaim = {
  raw: string;
  normalized: number;
  kind: "percent" | "absolute" | "currency";
};

export type NarrativeQualityFailureCode =
  | "untraceable_numeric_claim"
  | "severity_language_drift"
  | "trust_language_drift"
  | "forbidden_derivation_language";

export const NARRATIVE_SEVERITY_LEVEL = {
  info: 0,
  warning: 1,
  critical: 2,
} as const;

export type NarrativeSeverityLevel =
  (typeof NARRATIVE_SEVERITY_LEVEL)[keyof typeof NARRATIVE_SEVERITY_LEVEL];

export const TRUST_LEVEL = {
  GREEN: 0,
  AMBER: 1,
  RED: 2,
} as const;

export type TrustLevel = (typeof TRUST_LEVEL)[keyof typeof TRUST_LEVEL];

/** Interno — MAI in GeneratedNarrativeDto, MAI export API pubblico. */
export type NarrativeQualityReport = {
  checkedClaims: number;
  rejectedClaims: number;
  checks: {
    numeric: boolean;
    severity: boolean;
    trust: boolean;
    denylist: boolean;
  };
  failureCode?: NarrativeQualityFailureCode;
};

export type ValidateNarrativeQualityResult =
  | { ok: true; report: NarrativeQualityReport }
  | {
      ok: false;
      reason: string;
      code: NarrativeQualityFailureCode;
      report: NarrativeQualityReport;
    };

export function createEmptyQualityReport(): NarrativeQualityReport {
  return {
    checkedClaims: 0,
    rejectedClaims: 0,
    checks: { numeric: true, severity: true, trust: true, denylist: true },
  };
}
