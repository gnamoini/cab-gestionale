/** Provider-agnostic API key format validation (extracted from legacy gemini resolver). */

export type ApiKeyFormatInspection = {
  valid: boolean;
  issues: string[];
};

export function inspectApiKeyFormat(key: string | null | undefined): ApiKeyFormatInspection {
  const issues: string[] = [];
  if (key == null || key === "") {
    issues.push("missing");
    return { valid: false, issues };
  }
  if (key !== key.trim()) issues.push("needs_trim");
  if (/\r|\n/.test(key)) issues.push("contains_newline");
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    issues.push("wrapped_quotes");
  }
  const trimmed = key.trim();
  if (/\s/.test(trimmed)) issues.push("contains_whitespace");
  if (trimmed.length < 12) issues.push("too_short");
  if (trimmed === "test") issues.push("placeholder_test");
  if (
    !trimmed.startsWith("AIza") &&
    !/^AQ\./i.test(trimmed) &&
    !/^[A-Za-z0-9_.-]{20,}$/.test(trimmed)
  ) {
    issues.push("invalid_charset_or_length");
  }
  const valid =
    trimmed.startsWith("AIza") ||
    /^AQ\./i.test(trimmed) ||
    /^[A-Za-z0-9_.-]{20,}$/.test(trimmed);
  if (!valid && issues.length === 0) issues.push("format_rejected");
  return { valid, issues };
}
