import type { InsightSeverity } from "@/lib/report/insights/types";
import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import {
  NARRATIVE_SEVERITY_LEVEL,
  type NarrativeSeverityLevel,
} from "@/lib/report/narrative/quality/narrative-quality.types";

const CRITICAL_SEVERITY_PATTERNS = [/\bcritic[oa]\b/i, /\burgente\b/i, /\ballarme rosso\b/i];
const WARNING_SEVERITY_PATTERNS = [/\battenzione\b/i, /\brischio\b/i];
const INFO_SEVERITY_PATTERNS = [/\bnota\b/i, /\bindicazione\b/i];

const HIGH_ASSERTIVENESS_PATTERNS = [
  /\bdefinitiv/i,
  /\bconfermat/i,
  /\bcerto\b/i,
  /\baffidabil/i,
];

const MEDIUM_ASSERTIVENESS_PATTERNS = [/\bindicativ/i, /\bstima\b/i];

export function signalSeverityLevel(severity: InsightSeverity): NarrativeSeverityLevel {
  return NARRATIVE_SEVERITY_LEVEL[severity];
}

export function detectLanguageSeverity(text: string): NarrativeSeverityLevel {
  if (CRITICAL_SEVERITY_PATTERNS.some((re) => re.test(text))) {
    return NARRATIVE_SEVERITY_LEVEL.critical;
  }
  if (WARNING_SEVERITY_PATTERNS.some((re) => re.test(text))) {
    return NARRATIVE_SEVERITY_LEVEL.warning;
  }
  if (INFO_SEVERITY_PATTERNS.some((re) => re.test(text))) {
    return NARRATIVE_SEVERITY_LEVEL.info;
  }
  return NARRATIVE_SEVERITY_LEVEL.info;
}

/** Assertiveness cap by signal trust — higher = more confident language allowed. */
const MAX_ASSERTIVENESS_BY_TRUST: Record<TrustStatus, number> = {
  GREEN: 2,
  AMBER: 1,
  RED: 0,
};

export function detectTextAssertiveness(text: string): number {
  if (HIGH_ASSERTIVENESS_PATTERNS.some((re) => re.test(text))) return 2;
  if (MEDIUM_ASSERTIVENESS_PATTERNS.some((re) => re.test(text))) return 1;
  return 0;
}

export function exceedsTrustAssertivenessCap(text: string, signalTrust: TrustStatus): boolean {
  return detectTextAssertiveness(text) > MAX_ASSERTIVENESS_BY_TRUST[signalTrust];
}
