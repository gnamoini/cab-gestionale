import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";

const FORBIDDEN_CONTENT_KEYS = new Set([
  "severity",
  "trust",
  "priority",
  "metricValue",
  "kpiValue",
]);

export type ValidateGeneratedNarrativeResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateGeneratedNarrative(
  content: GeneratedNarrativeContent,
  input: NarrativePromptContext,
): ValidateGeneratedNarrativeResult {
  const signalByRuleKey = new Map(input.signals.map((s) => [s.ruleKey, s]));
  const seenRuleKeys = new Set<string>();

  if (content.sections.length > input.signals.length) {
    return { ok: false, reason: "sections exceed input signals count" };
  }

  for (const section of content.sections) {
    for (const key of Object.keys(section)) {
      if (FORBIDDEN_CONTENT_KEYS.has(key)) {
        return { ok: false, reason: `forbidden field in section: ${key}` };
      }
    }

    if (seenRuleKeys.has(section.ruleKey)) {
      return { ok: false, reason: `duplicate ruleKey: ${section.ruleKey}` };
    }
    seenRuleKeys.add(section.ruleKey);

    const signal = signalByRuleKey.get(section.ruleKey);
    if (!signal) {
      return { ok: false, reason: `unknown ruleKey: ${section.ruleKey}` };
    }

    const allowedMetrics = new Set(signal.metricIds);
    for (const metricId of section.metricIds) {
      if (!allowedMetrics.has(metricId)) {
        return { ok: false, reason: `metricId not in signal: ${metricId}` };
      }
    }
  }

  return { ok: true };
}
