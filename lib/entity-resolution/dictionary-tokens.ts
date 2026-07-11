import { LEGAL_SUFFIX_TOKENS } from "@/lib/entity-resolution/legal-suffix";

/** Token officina da rimuovere in tier dictionary (dopo alias, prima fuzzy). */
export const OFFICINA_STRIP_TOKENS: readonly string[] = [
  ...LEGAL_SUFFIX_TOKENS,
  "societa",
  "società",
  "ltd",
  "gmbh",
  "inc",
  "corp",
  "international",
  "europe",
  "europa",
];

export function dictionaryVersionHash(): string {
  return `dict-v1-${OFFICINA_STRIP_TOKENS.length}`;
}

export function stripDictionaryTokens(value: string): string {
  let tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return value.trim();
  const lower = new Set(OFFICINA_STRIP_TOKENS.map((t) => t.toLowerCase()));
  while (tokens.length > 1 && lower.has(tokens[tokens.length - 1]!.toLowerCase())) {
    tokens = tokens.slice(0, -1);
  }
  return tokens.join(" ").trim() || value.trim();
}
