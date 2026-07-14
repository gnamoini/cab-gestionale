"use client";

import { dsFocus } from "@/lib/ui/design-system";

export type MezziPageView = "anagrafica" | "tagliandi";

export function MezziPageViewToggle({
  value,
  onChange,
}: {
  value: MezziPageView;
  onChange: (next: MezziPageView) => void;
}) {
  const btn =
    "rounded-[var(--ds-radius-lg)] px-3 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:py-2 sm:text-sm";
  return (
    <div
      className="inline-flex gap-0.5 rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] p-0.5 shadow-[var(--cab-shadow-sm)]"
      role="group"
      aria-label="Vista pagina mezzi"
    >
      <button
        type="button"
        className={`${btn} ${value === "anagrafica" ? "bg-[var(--cab-primary)] text-white shadow-sm" : "text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"} ${dsFocus}`}
        aria-pressed={value === "anagrafica"}
        onClick={() => onChange("anagrafica")}
      >
        Anagrafica
      </button>
      <button
        type="button"
        className={`${btn} ${value === "tagliandi" ? "bg-[var(--cab-primary)] text-white shadow-sm" : "text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"} ${dsFocus}`}
        aria-pressed={value === "tagliandi"}
        onClick={() => onChange("tagliandi")}
      >
        Tagliandi
      </button>
    </div>
  );
}
