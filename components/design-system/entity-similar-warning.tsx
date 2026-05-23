"use client";

import { useMemo } from "react";
import { findSimilarEntityInPool } from "@/lib/validation/global-entity-validation";
import type { FuzzyMatchEntityOptions } from "@/lib/validation/global-entity-validation";

/** Warning non bloccante: entità simile già presente nell'elenco. */
export function EntitySimilarWarning({
  similarTo,
  className,
}: {
  similarTo: string | null | undefined;
  className?: string;
}) {
  if (!similarTo?.trim()) return null;
  return (
    <p
      className={`mt-1 flex items-start gap-1.5 text-[11px] font-medium leading-snug text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))] ${className ?? ""}`.trim()}
      role="status"
    >
      <span aria-hidden className="shrink-0">
        ⚠
      </span>
      <span>
        Entità simile già esistente:{" "}
        <span className="font-semibold text-[color:color-mix(in_srgb,var(--cab-warning)_95%,var(--cab-text))]">
          {similarTo}
        </span>
      </span>
    </p>
  );
}

export function useEntitySimilarWarning(
  value: string,
  existing: readonly string[],
  options?: FuzzyMatchEntityOptions,
): string | null {
  return useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed || existing.length === 0) return null;
    return findSimilarEntityInPool(trimmed, existing, options);
  }, [value, existing, options]);
}
