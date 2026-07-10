"use client";

import { Tooltip } from "@/components/ui";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { cyclePageAccessLevel, pageAccessLabel, pageAccessShortCode } from "@/src/lib/permissions/gestionale-pages";
import { dsFocusRing } from "@/lib/ui/design-system";

const LEVEL_CLASS: Record<PageAccessLevel, string> = {
  write:
    "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-primary)]",
  read:
    "border-[color:color-mix(in_srgb,var(--cab-border-strong)_80%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] font-semibold text-[color:var(--cab-text)]",
  none:
    "border-[color:var(--cab-border)] bg-transparent font-medium text-[color:var(--cab-text-muted)]",
};

type Props = {
  level: PageAccessLevel;
  ariaLabel: string;
  locked?: boolean;
  readOnly?: boolean;
  onChange?: (level: PageAccessLevel) => void;
  size?: "sm" | "md";
};

export function PageAccessLevelCell({
  level,
  ariaLabel,
  locked = false,
  readOnly = false,
  onChange,
  size = "md",
}: Props) {
  const effectiveLevel = locked ? "write" : level;
  const disabled = readOnly || locked;
  const dim = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";

  if (disabled) {
    const tooltip = locked
      ? `${pageAccessLabel(effectiveLevel)} (bloccato)`
      : pageAccessLabel(effectiveLevel);
    return (
      <Tooltip content={tooltip}>
        <span
          className={`inline-flex ${dim} items-center justify-center rounded-md border ${LEVEL_CLASS[effectiveLevel]}`}
          aria-label={ariaLabel}
        >
          {pageAccessShortCode(effectiveLevel)}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={`${pageAccessLabel(effectiveLevel)} — clic per cambiare`}>
      <button
        type="button"
        className={`inline-flex ${dim} items-center justify-center rounded-md border transition-[background-color,border-color,color] duration-150 hover:brightness-[1.03] ${LEVEL_CLASS[effectiveLevel]} ${dsFocusRing}`}
        aria-label={`${ariaLabel}: ${pageAccessLabel(effectiveLevel)}`}
        onClick={() => onChange?.(cyclePageAccessLevel(level))}
      >
        {pageAccessShortCode(effectiveLevel)}
      </button>
    </Tooltip>
  );
}

export function PageAccessLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--cab-text-muted)] ${className}`}
      aria-label="Legenda permessi"
    >
      <span className="inline-flex items-center gap-1.5">
        <PageAccessLevelCell level="write" ariaLabel="Scrittura" readOnly size="sm" />
        Scrittura
      </span>
      <span className="inline-flex items-center gap-1.5">
        <PageAccessLevelCell level="read" ariaLabel="Lettura" readOnly size="sm" />
        Lettura
      </span>
      <span className="inline-flex items-center gap-1.5">
        <PageAccessLevelCell level="none" ariaLabel="Nessun accesso" readOnly size="sm" />
        Nessun accesso
      </span>
      <span className="hidden sm:inline">Clic sulla cella per cambiare livello</span>
    </div>
  );
}
