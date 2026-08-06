"use client";

import { dsAccentSoftBanner } from "@/lib/ui/design-system";

export function SchedaIngressoMezzoInOfficinaHint({ lavorazioneLabel }: { lavorazioneLabel: string }) {
  return (
    <div
      className={`${dsAccentSoftBanner} rounded-[var(--ds-radius-lg)] border-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_45%,var(--cab-border))] px-3 py-2.5 text-sm shadow-[var(--cab-shadow-sm)]`}
      role="status"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_92%,var(--cab-text))]">
        ⚠ Mezzo già in officina
      </p>
      <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
        Questo mezzo risulta già presente fra le lavorazioni in corso
        {lavorazioneLabel.trim() ? (
          <>
            {" "}
            (<span className="font-medium text-[color:var(--cab-text)]">{lavorazioneLabel}</span>)
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
