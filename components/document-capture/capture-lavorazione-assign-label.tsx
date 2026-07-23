"use client";

import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";

export const CAPTURE_ASSIGN_CALLOUT_CLASS =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))]";

export function LavorazioneAssignLabelLines({
  parts,
  fallback,
  codiceClassName = "text-xs font-medium text-[color:var(--cab-text-muted)]",
  headlineClassName = "text-sm font-medium leading-snug text-[color:var(--cab-fg)]",
  identClassName = "text-xs leading-snug text-[color:var(--cab-text-muted)]",
}: {
  parts: LavorazioneAssignRowParts | null;
  fallback?: string;
  codiceClassName?: string;
  headlineClassName?: string;
  identClassName?: string;
}) {
  if (!parts) return null;
  const topLine = [parts.codice, parts.headlineLine].filter(Boolean).join(" · ");
  if (!topLine && !parts.identLine) {
    return fallback ? <p className={headlineClassName}>{fallback}</p> : null;
  }
  return (
    <div className="min-w-0 space-y-1">
      {topLine ? <p className={headlineClassName}>{topLine}</p> : null}
      {parts.identLine ? <p className={identClassName}>{parts.identLine}</p> : null}
    </div>
  );
}
