import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { normalizeAskMessage } from "@/lib/report/ask-report/intent/normalize-ask-message";

/** Estrae modalità confronto esplicita dalla domanda (override contesto UI). */
export function resolveCompareModeFromMessage(
  message: string,
  fallback: ReportCompareMode,
): ReportCompareMode {
  const text = normalizeAskMessage(message);

  if (
    /\banno\s+scorso\b|\bstesso\s+periodo\s+dell\s*anno\s+scorso\b|\byoy\b|\byear\s+over\s+year\b/i.test(
      text,
    )
  ) {
    return "prev_year";
  }

  if (
    /\bperiodo\s+precedente\b|\bmese\s+scorso\b|\bsettimana\s+scorsa\b|\bvs\s+precedente\b|\brispetto\s+al\s+precedente\b|\bconfronto\s+precedente\b|\bvariazion/i.test(
      text,
    )
  ) {
    return "prev_period";
  }

  if (/\bconfronta\b|\brispetto\s+a\b|\bvs\b|\bversus\b|\bin\s+percentuale\b|\bdelta\b/i.test(text)) {
    return fallback === "none" ? "prev_period" : fallback;
  }

  return fallback;
}

export function messageWantsComparison(message: string): boolean {
  const text = normalizeAskMessage(message);
  return /\bconfronta\b|\brispetto\b|\bvs\b|\bversus\b|\bvariazion|\bdelta\b|\bin\s+percentuale\b|\bmigliorat|\bpeggiorat/i.test(
    text,
  );
}
