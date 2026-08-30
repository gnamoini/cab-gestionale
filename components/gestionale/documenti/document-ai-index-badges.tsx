"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import type { DocumentAiIndexBadgeState } from "@/lib/documents/document-spare-parts-meta";
import {
  deriveDocumentAiIndexProgress,
  deriveDocumentAiIndexEnqueueProgress,
  type DocumentAiIndexProgressInput,
} from "@/lib/documents/document-ai-index-progress";

type StepKey = keyof DocumentAiIndexBadgeState;
type StepState = DocumentAiIndexBadgeState[StepKey];

type OverallUiState = "ready" | "error" | "processing" | "waiting" | "warning";

const STEP_LABEL: Record<StepKey, string> = {
  fileSearch: "File Search",
  aiCatalog: "Catalogo AI",
  exploded: "Esplosi",
};

function deriveOverallUiState(badges: DocumentAiIndexBadgeState): OverallUiState {
  const core: StepState[] = [badges.fileSearch, badges.aiCatalog];
  if (core.some((s) => s === "failed")) return "error";
  if (core.some((s) => s === "partial")) return "warning";
  if (core.every((s) => s === "ready")) return "ready";
  if (core.some((s) => s === "processing")) return "processing";
  if (core.some((s) => s === "none")) return "waiting";
  return "processing";
}

function overallHeadline(state: OverallUiState, staleWarning?: string | null): string {
  if (staleWarning) return "Indicizzazione in pausa";
  if (state === "ready") return "Pronto per Identifica ricambio";
  if (state === "warning") return "Indicizzato con avvisi";
  if (state === "error") return "Indicizzazione con errori";
  if (state === "processing") return "Indicizzazione in corso";
  return "In attesa di indicizzazione";
}

function overallHint(state: OverallUiState, badges: DocumentAiIndexBadgeState): string {
  if (state === "ready") {
    return "Il documento è utilizzabile nella ricerca ricambi.";
  }
  if (state === "warning") {
    return "Estrazione parziale o qualità bassa. Riprova l'indicizzazione per migliorare i risultati.";
  }
  if (state === "error") {
    if (badges.fileSearch === "failed") {
      return "Il caricamento su File Search è fallito. Riprova l'indicizzazione.";
    }
    if (badges.aiCatalog === "failed") {
      return "L'analisi del catalogo è fallita. Riprova l'indicizzazione.";
    }
    return "Uno o più passaggi sono falliti. Riprova l'indicizzazione.";
  }
  if (state === "processing") {
    return "Attendi il completamento o riapri il dettaglio tra qualche minuto.";
  }
  return "Avvia l'indicizzazione per rendere il documento ricercabile.";
}

function panelShellClass(state: OverallUiState): string {
  if (state === "ready") {
    return "border-[color:color-mix(in_srgb,var(--cab-success)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_8%,var(--cab-surface))]";
  }
  if (state === "warning") {
    return "border-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))]";
  }
  if (state === "error") {
    return "border-[color:color-mix(in_srgb,var(--cab-danger)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))]";
  }
  if (state === "processing") {
    return "border-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))]";
  }
  return "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface)_92%,transparent)]";
}

function stepStatusLabel(state: StepState): string {
  if (state === "ready") return "Completato";
  if (state === "processing") return "In corso";
  if (state === "failed") return "Errore";
  if (state === "partial") return "Parziale";
  if (state === "disabled") return "Disattivato";
  return "In attesa";
}

function stepStatusClass(state: StepState): string {
  if (state === "ready") return "text-[color:var(--cab-success)]";
  if (state === "processing") return "text-[color:var(--cab-warning)]";
  if (state === "failed") return "text-[color:var(--cab-danger)] font-semibold";
  if (state === "partial") return "text-[color:var(--cab-warning)]";
  return "text-[color:var(--cab-text-muted)]";
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "processing") {
    return <LoadingSpinner size="sm" label="In corso" className="shrink-0" />;
  }
  if (state === "ready") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-success)_22%,transparent)] text-xs text-[color:var(--cab-success)]"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,transparent)] text-xs text-[color:var(--cab-danger)]"
        aria-hidden
      >
        ✗
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)] text-xs text-[color:var(--cab-warning)]"
        aria-hidden
      >
        ~
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--cab-border)] text-[10px] text-[color:var(--cab-text-muted)]"
      aria-hidden
    >
      ○
    </span>
  );
}

function IndexStepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <StepIcon state={state} />
      <span className="min-w-0 flex-1 text-sm text-[color:var(--cab-text)]">{label}</span>
      <span className={`shrink-0 text-xs ${stepStatusClass(state)}`}>{stepStatusLabel(state)}</span>
    </li>
  );
}

export function DocumentAiIndexBadges({
  badges,
  indexMeta,
  actions,
  optimisticInFlight = false,
  enqueueStartedAt = null,
}: {
  badges: DocumentAiIndexBadgeState;
  indexMeta?: DocumentAiIndexProgressInput | null;
  actions?: ReactNode;
  optimisticInFlight?: boolean;
  enqueueStartedAt?: number | null;
}) {
  const effectiveBadges: DocumentAiIndexBadgeState =
    optimisticInFlight && !indexMeta?.status
      ? { fileSearch: "processing", aiCatalog: "processing", exploded: "none" }
      : badges;
  const overall = optimisticInFlight && !indexMeta?.status ? "processing" : deriveOverallUiState(effectiveBadges);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!optimisticInFlight && overall !== "processing" && overall !== "waiting") return;
    const timer = window.setInterval(() => setNowMs(Date.now()), optimisticInFlight ? 1_000 : 5_000);
    return () => window.clearInterval(timer);
  }, [optimisticInFlight, overall]);

  const progress = indexMeta ? deriveDocumentAiIndexProgress(indexMeta, nowMs) : null;
  const enqueueProgress =
    optimisticInFlight && enqueueStartedAt != null
      ? deriveDocumentAiIndexEnqueueProgress(enqueueStartedAt, nowMs)
      : null;
  const headline = progress?.staleWarning
    ? "Indicizzazione in pausa"
    : enqueueProgress && optimisticInFlight
      ? enqueueProgress.headline
      : progress?.phaseHeadline ?? overallHeadline(overall, progress?.staleWarning);
  const hint =
    enqueueProgress && optimisticInFlight
      ? enqueueProgress.hint
      : progress?.phaseHint ?? overallHint(overall, effectiveBadges);
  const panelState: OverallUiState = progress?.staleWarning ? "error" : overall;
  const steps: Array<{ key: StepKey; state: StepState }> = [
    { key: "fileSearch", state: effectiveBadges.fileSearch },
    { key: "aiCatalog", state: effectiveBadges.aiCatalog },
    { key: "exploded", state: effectiveBadges.exploded },
  ];

  return (
    <section
      className={`rounded-[var(--ds-radius-lg)] border p-3 ${panelShellClass(panelState)}`}
      aria-label="Stato indicizzazione Ricambi AI"
    >
      <div className="flex items-start gap-2.5">
        {overall === "processing" && !progress?.staleWarning ? (
          <LoadingSpinner size="md" label="Indicizzazione in corso" className="mt-0.5 shrink-0" />
        ) : (
          <span
            className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
              progress?.staleWarning
                ? "bg-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)] text-[color:var(--cab-warning)]"
                : overall === "ready"
                  ? "bg-[color:color-mix(in_srgb,var(--cab-success)_20%,transparent)] text-[color:var(--cab-success)]"
                  : overall === "warning"
                    ? "bg-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)] text-[color:var(--cab-warning)]"
                    : overall === "error"
                    ? "bg-[color:color-mix(in_srgb,var(--cab-danger)_16%,transparent)] text-[color:var(--cab-danger)]"
                    : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,transparent)] text-[color:var(--cab-text-muted)]"
            }`}
            aria-hidden
          >
            {progress?.staleWarning ? "!" : overall === "ready" ? "✓" : overall === "warning" ? "~" : overall === "error" ? "!" : "○"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Ricambi AI</p>
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">{headline}</p>
          <p className="mt-0.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">{hint}</p>
          {enqueueProgress?.warning && optimisticInFlight ? (
            <p className="mt-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-warning)_14%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]">
              <span aria-hidden>⚠ </span>
              {enqueueProgress.warning}
            </p>
          ) : null}
          {progress?.durationLabel || progress?.activityLabel ? (
            <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">
              {[progress.durationLabel, progress.activityLabel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {progress?.errorDetail ? (
            <p className="mt-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-danger)]">
              {progress.errorDetail}
            </p>
          ) : null}
          {progress?.staleWarning ? (
            <p className="mt-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-warning)_14%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]">
              <span aria-hidden>⚠ </span>
              {progress.staleWarning}
            </p>
          ) : progress?.expectedHint && overall !== "error" && overall !== "ready" && !optimisticInFlight ? (
            <p className="mt-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-text-muted)]">
              {progress.expectedHint}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-[color:color-mix(in_srgb,var(--cab-border)_70%,transparent)] rounded-md border border-[color:color-mix(in_srgb,var(--cab-border)_80%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-card)_65%,transparent)] px-2.5">
        {steps.map((step) => (
          <IndexStepRow key={step.key} label={STEP_LABEL[step.key]} state={step.state} />
        ))}
      </ul>

      {actions ? (
        <div className="mt-3 border-t border-[color:color-mix(in_srgb,var(--cab-border)_75%,transparent)] pt-3">{actions}</div>
      ) : null}
    </section>
  );
}
