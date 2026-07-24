import {
  normalizeEntityString,
  type NormalizeEntityStringOptions,
} from "@/lib/validation/global-entity-validation";

export type { NormalizeEntityStringOptions };

/** Normalizza testo ricerca — wrap SSOT global-entity-validation. */
export function normalizeSearchText(value: string, options?: NormalizeEntityStringOptions): string {
  return normalizeEntityString(value, options);
}

/** Tokenizza query normalizzata (spazi). */
export function tokenizeSearchQuery(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}
