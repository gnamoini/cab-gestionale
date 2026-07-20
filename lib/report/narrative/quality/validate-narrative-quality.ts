import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import { findDerivedClaimTerm } from "@/lib/report/narrative/quality/derived-claim-denylist";
import {
  detectLanguageSeverity,
  exceedsTrustAssertivenessCap,
  signalSeverityLevel,
} from "@/lib/report/narrative/quality/detect-language-levels";
import { extractNarrativeClaims } from "@/lib/report/narrative/quality/extract-narrative-claims";
import {
  extractNumericEvidence,
  numericEvidenceMatches,
} from "@/lib/report/narrative/quality/extract-numeric-evidence";
import {
  createEmptyQualityReport,
  type NarrativeQualityFailureCode,
  type NarrativeQualityReport,
  type ValidateNarrativeQualityResult,
} from "@/lib/report/narrative/quality/narrative-quality.types";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";

function fail(
  report: NarrativeQualityReport,
  code: NarrativeQualityFailureCode,
  reason: string,
): ValidateNarrativeQualityResult {
  return {
    ok: false,
    code,
    reason,
    report: { ...report, failureCode: code },
  };
}

export function validateNarrativeQuality(
  content: GeneratedNarrativeContent,
  input: NarrativePromptContext,
): ValidateNarrativeQualityResult {
  const report = createEmptyQualityReport();
  const signalByRuleKey = new Map(input.signals.map((s) => [s.ruleKey, s]));

  for (const section of content.sections) {
    const signal = signalByRuleKey.get(section.ruleKey);
    if (!signal) continue;

    const derivedTerm = findDerivedClaimTerm(section.explanation, section.ruleKey);
    if (derivedTerm) {
      report.checks.denylist = false;
      return fail(
        report,
        "forbidden_derivation_language",
        `forbidden derived claim term: ${derivedTerm}`,
      );
    }

    const languageSeverity = detectLanguageSeverity(section.explanation);
    const signalSeverity = signalSeverityLevel(signal.severity);
    if (languageSeverity > signalSeverity) {
      report.checks.severity = false;
      return fail(
        report,
        "severity_language_drift",
        `language severity exceeds signal severity for ${section.ruleKey}`,
      );
    }

    if (exceedsTrustAssertivenessCap(section.explanation, signal.trust)) {
      report.checks.trust = false;
      return fail(
        report,
        "trust_language_drift",
        `language trust exceeds signal trust for ${section.ruleKey}`,
      );
    }

    const evidence = extractNumericEvidence(signal.payload);
    const claims = extractNarrativeClaims(section.explanation);
    report.checkedClaims += claims.length;

    for (const claim of claims) {
      if (!numericEvidenceMatches(evidence, claim.normalized, claim.kind)) {
        report.rejectedClaims += 1;
        report.checks.numeric = false;
        return fail(
          report,
          "untraceable_numeric_claim",
          `untraceable numeric claim "${claim.raw}" for ${section.ruleKey}`,
        );
      }
    }
  }

  return { ok: true, report };
}
