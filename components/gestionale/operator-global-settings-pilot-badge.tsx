"use client";

import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";

/** Badge discreto: pilot operatore impostazioni globali (env + DB). */
export function OperatorGlobalSettingsPilotBadge({ className = "" }: { className?: string }) {
  const { isPilotActive } = useOperatorGlobalSettings();
  if (!isPilotActive) return null;

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] ${className}`}
      title="Override pilot: operatori con impostazioni globali (env + flag database)"
    >
      Modalità pilot attiva
    </span>
  );
}
