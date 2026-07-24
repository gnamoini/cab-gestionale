import { normalizeSearchText } from "@/lib/search/normalize";
import type { FieldFilter, ParsedSearchQuery } from "@/lib/search/types";

const FIELD_FILTER_RE = /^([a-zA-Z_][\w-]*)\s*:\s*(.+)$/;

function extractQuotedPhrases(input: string): { phrases: string[]; remainder: string } {
  const phrases: string[] = [];
  let remainder = input;
  const re = /"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    const phrase = match[1]?.trim();
    if (phrase) phrases.push(phrase);
    remainder = remainder.replace(match[0], " ");
  }
  return { phrases, remainder: remainder.trim() };
}

function parseFieldFilters(segment: string): { fieldFilters: FieldFilter[]; freeText: string } {
  const fieldFilters: FieldFilter[] = [];
  const freeParts: string[] = [];
  for (const part of segment.split(/\s+/).filter(Boolean)) {
    const m = FIELD_FILTER_RE.exec(part);
    if (m) {
      fieldFilters.push({
        field: m[1]!.toLowerCase(),
        value: normalizeSearchText(m[2]!),
        raw: part,
      });
    } else {
      freeParts.push(part);
    }
  }
  return { fieldFilters, freeText: freeParts.join(" ") };
}

/**
 * Parse toolbar search string.
 * - `"pompa idraulica"` → phrase mode
 * - `HB440PC Iveco` → token mode (AND)
 * - `cliente:mottola` → field filter (stub, ignored by match until wired)
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw: "", mode: "tokens", tokens: [], fieldFilters: [] };
  }

  const { phrases, remainder } = extractQuotedPhrases(trimmed);
  const { fieldFilters, freeText } = parseFieldFilters(remainder);

  if (phrases.length === 1) {
    const phrase = normalizeSearchText(phrases[0]!);
    return {
      raw: trimmed,
      mode: "phrase",
      tokens: phrase ? phrase.split(/\s+/).filter(Boolean) : [],
      phrase,
      fieldFilters,
    };
  }

  const combined = [...phrases, freeText].filter(Boolean).join(" ");
  const normalized = normalizeSearchText(combined);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return {
    raw: trimmed,
    mode: "tokens",
    tokens,
    fieldFilters,
  };
}
