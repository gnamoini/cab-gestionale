/** OEM triple-store: raw / normalized / search lookup key. */

export function toNormalizedCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase().replace(/\s+/g, " ");
}

/** Chiave lookup: separatori distinti (- vs .) non collidono. */
export function toSearchCode(raw: string | null | undefined): string | null {
  const normalized = toNormalizedCode(raw);
  if (!normalized) return null;
  return normalized
    .replace(/\./g, "DOT")
    .replace(/-/g, "HYPH")
    .replace(/\s/g, "");
}

export function oemTripleFromRaw(raw: string | null | undefined): {
  partNumberRaw: string | null;
  partNumberNormalized: string | null;
  partNumberSearch: string | null;
} {
  if (!raw?.trim()) {
    return { partNumberRaw: null, partNumberNormalized: null, partNumberSearch: null };
  }
  const partNumberRaw = raw.trim();
  return {
    partNumberRaw,
    partNumberNormalized: toNormalizedCode(partNumberRaw),
    partNumberSearch: toSearchCode(partNumberRaw),
  };
}

export function pickBestOemRaw(
  candidate?: string | null,
  verified?: string | null,
): string | null {
  const v = verified?.trim();
  if (v) return v;
  const c = candidate?.trim();
  return c || null;
}
