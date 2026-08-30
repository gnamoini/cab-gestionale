import { stripDictionaryTokens } from "@/lib/entity-resolution/dictionary-tokens";
import { LEGAL_SUFFIX_REPLACERS } from "@/lib/entity-resolution/legal-suffix";
import {
  entityAutocompleteKey,
} from "@/lib/validation/global-entity-validation";

export type EntityNormalizeOptions = {
  unicode?: boolean;
  stripLegalSuffix?: boolean;
  stripGeographic?: boolean;
  punctuation?: boolean;
  dictionary?: boolean;
};

function baseNormalize(value: string, options?: EntityNormalizeOptions): string {
  let s = value.trim();
  if (!s) return "";

  if (options?.stripLegalSuffix !== false) {
    for (const [re, repl] of LEGAL_SUFFIX_REPLACERS) {
      s = s.replace(re, repl);
    }
  }

  if (options?.punctuation !== false) {
    s = s.replace(/[.,;:'"!?()[\]{}\\/|@#$%^&*+=~`<>]/g, " ");
  }

  s = s.replace(/\s+/g, " ").trim();

  if (options?.unicode !== false) {
    s = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } else {
    s = s.toLowerCase();
  }

  if (options?.stripGeographic !== false) {
    s = s
      .replace(/\b(italia|italy|europa|europe)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return s;
}

export function normalizeEntityInput(value: string, options?: EntityNormalizeOptions): string {
  return baseNormalize(value, options);
}

export function entityNormKey(value: string, options?: EntityNormalizeOptions): string {
  return entityAutocompleteKey(value, { standardizeLegalSuffix: options?.stripLegalSuffix ?? false });
}

export function canonicalizeEntityName(
  value: string,
  pool: readonly string[],
  options?: EntityNormalizeOptions,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const dictStripped = options?.dictionary ? stripDictionaryTokens(trimmed) : trimmed;
  const normalized = baseNormalize(dictStripped, options);
  if (!normalized) return trimmed;

  const poolNorm = pool.map((p) => ({
    label: p,
    norm: baseNormalize(p, options),
    key: entityNormKey(p, options),
  }));

  const inputKey = entityNormKey(dictStripped, options);
  const exact = poolNorm.find((p) => p.key === inputKey || p.norm === normalized);
  if (exact) return exact.label;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (let len = tokens.length; len >= 1; len -= 1) {
    const prefix = tokens.slice(0, len).join(" ");
    const hit = poolNorm.find((p) => p.norm === prefix || p.norm.startsWith(`${prefix} `));
    if (hit) return hit.label;
  }

  return dictStripped.trim();
}

export function ocrNormKey(value: string, entityType: string): string {
  return `${entityType}:${entityNormKey(value, { stripLegalSuffix: true, stripGeographic: true })}`;
}
