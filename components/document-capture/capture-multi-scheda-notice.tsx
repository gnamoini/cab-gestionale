"use client";

export function CaptureMultiSchedaNotice({
  schedaLabels,
  identWarnings = [],
}: {
  schedaLabels: string;
  identWarnings?: readonly string[];
}) {
  return (
    <div
      role="status"
      className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))] px-3 py-2.5 text-sm text-[color:var(--cab-fg)]"
    >
      <p className="font-medium">Più schede lette insieme</p>
      <p className="mt-1 text-[color:var(--cab-muted-fg)]">
        Rilevate: <span className="text-[color:var(--cab-fg)]">{schedaLabels}</span>. Prima crei la lavorazione con
        scheda ingresso, poi completerai lavorazioni e ricambi sulla stessa lavorazione.
      </p>
      {identWarnings.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[color:var(--cab-warning-fg,var(--cab-danger))]">
          {identWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
