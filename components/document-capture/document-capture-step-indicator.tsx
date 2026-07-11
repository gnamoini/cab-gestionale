"use client";

export type DocumentCaptureFlowStep = "hub" | "analyze" | "review" | "confirm";

const STEPS: { id: DocumentCaptureFlowStep; label: string; shortLabel: string }[] = [
  { id: "hub", label: "Carica documento", shortLabel: "Carica" },
  { id: "analyze", label: "Leggi con AI", shortLabel: "AI" },
  { id: "review", label: "Controlla i dati", shortLabel: "Controlla" },
  { id: "confirm", label: "Crea lavorazione", shortLabel: "Crea" },
];

function StepCheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.2 6.4 11 12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocumentCaptureStepIndicator({ current }: { current: DocumentCaptureFlowStep }) {
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.id === current));
  const progressPct = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <nav
      aria-label="Passaggi acquisizione"
      className="sticky top-0 z-[1] -mx-1 bg-[var(--cab-card)] px-1 pb-3 pt-0.5"
    >
      <ol className="flex w-full items-start justify-between gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const upcoming = index > currentIndex;

          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
              aria-current={active ? "step" : undefined}
            >
              <div className="flex w-full min-w-0 items-center">
                {index > 0 ? (
                  <div
                    aria-hidden
                    className={`mx-0.5 hidden h-px min-w-2 flex-1 sm:block ${
                      done
                        ? "bg-[color:color-mix(in_srgb,var(--cab-accent)_70%,var(--cab-border))]"
                        : "bg-[color:var(--cab-border)] opacity-35"
                    }`}
                  />
                ) : (
                  <span className="hidden min-w-2 flex-1 sm:block" aria-hidden />
                )}
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ${
                    active
                      ? "scale-105 bg-[var(--cab-accent)] text-[var(--cab-accent-fg)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-accent)_32%,transparent),var(--cab-shadow-sm)]"
                      : done
                        ? "border border-[color:color-mix(in_srgb,var(--cab-accent)_48%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-accent)_88%,var(--cab-text))]"
                        : "border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,transparent)] text-[color:var(--cab-muted-fg)] opacity-40"
                  }`}
                >
                  {done ? <StepCheckIcon /> : index + 1}
                </span>
                {index < STEPS.length - 1 ? (
                  <div
                    aria-hidden
                    className={`mx-0.5 hidden h-px min-w-2 flex-1 sm:block ${
                      done
                        ? "bg-[color:color-mix(in_srgb,var(--cab-accent)_70%,var(--cab-border))]"
                        : "bg-[color:var(--cab-border)] opacity-35"
                    }`}
                  />
                ) : (
                  <span className="hidden min-w-2 flex-1 sm:block" aria-hidden />
                )}
              </div>
              <span
                className={`max-w-full truncate px-0.5 text-[10px] leading-tight sm:text-xs ${
                  active
                    ? "font-semibold text-[color:var(--cab-fg)]"
                    : done
                      ? "font-medium text-[color:color-mix(in_srgb,var(--cab-text)_72%,var(--cab-muted-fg))]"
                      : "font-normal text-[color:var(--cab-muted-fg)] opacity-40"
                }`}
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
              {upcoming ? <span className="sr-only"> — in attesa</span> : null}
              {done ? <span className="sr-only"> — completato</span> : null}
            </li>
          );
        })}
      </ol>
      <div
        className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-[color:var(--cab-border)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[var(--cab-accent)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="sr-only">
        Passaggio {currentIndex + 1} di {STEPS.length}: {STEPS[currentIndex]?.label}
      </p>
    </nav>
  );
}

export const DOCUMENT_CAPTURE_STEP_COPY: Record<
  DocumentCaptureFlowStep,
  { title: string; subtitle: string }
> = {
  hub: {
    title: "Acquisizione scheda",
    subtitle:
      "Carica foto, PDF, Word o Excel della scheda compilata. I documenti Office vengono convertiti automaticamente per la lettura AI.",
  },
  analyze: {
    title: "Lettura documento",
    subtitle: "Stiamo estraendo i dati dalla scheda con l'intelligenza artificiale.",
  },
  review: {
    title: "Controlla i dati",
    subtitle:
      "Verifica e correggi i campi letti. Per schede lavorazioni/ricambi verrà cercata una lavorazione in corso con scheda ingresso corrispondente.",
  },
  confirm: {
    title: "Crea lavorazione",
    subtitle: "Verifica i campi precompilati dalla scheda e salva la nuova lavorazione.",
  },
};
