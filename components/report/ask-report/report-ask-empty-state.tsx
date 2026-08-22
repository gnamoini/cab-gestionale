"use client";

export function ReportAskEmptyState({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 text-center" data-testid="report-ask-empty">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))] text-lg font-semibold text-[color:var(--cab-primary)]">
        AI
      </div>
      <h3 className="text-base font-semibold text-[color:var(--cab-text)]">Chiedi al Report</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
        Interroga il BI Center in linguaggio naturale. Le risposte usano solo dati certificati del periodo selezionato.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        {prompts.slice(0, 6).map((p) => (
          <button
            key={p}
            type="button"
            className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5 text-left text-xs leading-snug text-[color:var(--cab-text)] transition hover:border-[color:color-mix(in_srgb,var(--cab-primary)_25%,var(--cab-border))] hover:bg-[color:var(--cab-surface-muted)]"
            onClick={() => onSelect(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
