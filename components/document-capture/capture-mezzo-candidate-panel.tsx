"use client";

import { useCallback, useMemo, useState } from "react";
import { MezzoSelectionPanel } from "@/components/gestionale/mezzi/mezzo-selection-panel";
import { CAPTURE_ASSIGN_CALLOUT_CLASS } from "@/components/document-capture/capture-lavorazione-assign-label";
import { formatCaptureMezzoMatchPercent } from "@/lib/document-capture/capture-mezzo-catalog-match";
import type { CaptureMezzoMatchCandidate } from "@/lib/document-capture/capture-mezzo-catalog-match";
import type { CaptureMezzoMatchState } from "@/lib/document-capture/capture-mezzo-match-state";
import { canConfirmCaptureMezzoMatch } from "@/lib/document-capture/capture-mezzo-match-state";
import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import type { CaptureIngressoContextResolution } from "@/lib/document-capture/resolve-capture-ingresso-context";
import { describeCaptureLavorazioneAssignTarget } from "@/lib/document-capture/capture-lavorazione-match";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SelectedMezzoContext } from "@/lib/lavorazioni/selected-mezzo-context";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import { dsBtnNeutral, dsBtnPrimary, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

function CandidateReasonList({ candidate }: { candidate: CaptureMezzoMatchCandidate }) {
  const lines = candidate.reasons.filter(
    (r) => r.type === "exact" || r.type === "normalized" || r.type === "missing_in_registry",
  );
  if (lines.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-[color:var(--cab-text-muted)]">
      {lines.map((r) => (
        <li key={`${r.field}-${r.type}`}>
          ✓{" "}
          {r.field === "targa"
            ? `Targa ${r.scannedValue || r.catalogValue} trovata`
            : r.field === "matricola"
              ? `Matricola ${r.scannedValue || r.catalogValue} trovata`
              : r.field === "vin"
                ? `VIN ${r.scannedValue || r.catalogValue} trovato`
                : r.field === "cliente"
                  ? "Cliente coincidente"
                  : `${r.field} coincidente`}
        </li>
      ))}
    </ul>
  );
}

export function CaptureMezzoCandidatePanel({
  context,
  matchState,
  selectedCandidate,
  mergeResult,
  conflictResolutions,
  mezziCatalog,
  catalogLoading,
  userId,
  attive,
  schedeStore,
  onConfirmMezzo,
  onForceNewMezzo,
  onDismiss,
  onSelectCandidate,
  onManualSelect,
}: {
  context: CaptureIngressoContextResolution;
  matchState: CaptureMezzoMatchState;
  selectedCandidate: CaptureMezzoMatchCandidate | null;
  mergeResult: CaptureIngressoMergeResult | null;
  conflictResolutions: Partial<Record<string, "registry" | "scan" | "manual">>;
  mezziCatalog: readonly MezzoGestito[];
  catalogLoading?: boolean;
  userId?: string | null;
  attive: readonly LavorazioneAttiva[];
  schedeStore: LavorazioneSchedeStore;
  onConfirmMezzo: () => void;
  onForceNewMezzo: () => void;
  onDismiss: () => void;
  onSelectCandidate: (candidate: CaptureMezzoMatchCandidate) => void;
  onManualSelect: (ctx: SelectedMezzoContext) => void;
}) {
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const confirmEnabled = useMemo(
    () =>
      canConfirmCaptureMezzoMatch({
        state: matchState,
        matchStrength: selectedCandidate?.matchStrength ?? context.mezzo.matchStrength,
        conflicts: mergeResult?.conflicts ?? [],
        conflictResolutions,
      }),
    [conflictResolutions, context.mezzo.matchStrength, matchState, mergeResult?.conflicts, selectedCandidate],
  );

  const handleManualSelect = useCallback(
    (ctx: SelectedMezzoContext) => {
      setManualSearchOpen(false);
      setQuery("");
      onManualSelect(ctx);
    },
    [onManualSelect],
  );

  if (matchState === "confirmed" || matchState === "dismissed" || matchState === "force_new_mezzo") {
    if (matchState === "force_new_mezzo") {
      return (
        <div className={`${CAPTURE_ASSIGN_CALLOUT_CLASS} mb-3 px-3 py-2.5 text-sm`} role="status">
          <p className="font-medium text-[color:var(--cab-fg)]">Nuovo mezzo — dati dalla scansione</p>
        </div>
      );
    }
    return null;
  }

  const lavId = context.lavorazione.recommendedMatch?.lavorazioneId;
  const lavLabel =
    lavId && context.priority === "lavorazione_existing"
      ? describeCaptureLavorazioneAssignTarget(lavId, attive, schedeStore)
      : null;

  return (
    <div className="mb-3 space-y-2">
      {lavLabel ? (
        <div className={`${CAPTURE_ASSIGN_CALLOUT_CLASS} px-3 py-2.5 text-sm`} role="status">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-primary)]">
            Lavorazione aperta
          </p>
          <p className="mt-1 text-[color:var(--cab-text-muted)]">{context.contextHint}</p>
          <p className="mt-1 font-medium text-[color:var(--cab-fg)]">{lavLabel}</p>
        </div>
      ) : null}

      {context.mezzo.decision === "no_match" ? (
        <div
          className="rounded-[var(--ds-radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">Nessun mezzo corrispondente con sufficiente confidenza</p>
          <p className="mt-1 text-xs">{context.contextHint}</p>
          <div className="mt-2 flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <button type="button" className={`${dsBtnPrimary} ${dsFocus} text-xs`} onClick={onForceNewMezzo}>
              Nuovo mezzo
            </button>
            <button
              type="button"
              className={`${dsBtnNeutral} ${dsFocus} text-xs`}
              onClick={() => setManualSearchOpen((v) => !v)}
            >
              Cerca manualmente
            </button>
          </div>
        </div>
      ) : null}

      {selectedCandidate && context.mezzo.decision !== "no_match" ? (
        <div className={`${CAPTURE_ASSIGN_CALLOUT_CLASS} px-3 py-2.5`} role="status">
          <p className="text-sm font-medium text-[color:var(--cab-fg)]">
            {matchState === "conflict_pending"
              ? "Risolvi i conflitti prima di confermare"
              : "Questo mezzo è corretto?"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--cab-fg)]">
            {formatCaptureMezzoMatchPercent(selectedCandidate.percentage)} —{" "}
            {mezzoIngressoSuggestLabel(selectedCandidate.mezzo)}
          </p>
          <CandidateReasonList candidate={selectedCandidate} />
          <div className="mt-3 flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <button
              type="button"
              className={`${dsBtnPrimary} ${dsFocus} text-xs`}
              disabled={!confirmEnabled}
              onClick={onConfirmMezzo}
            >
              Conferma mezzo
            </button>
            <button type="button" className={`${dsBtnSoftOrange} ${dsFocus} text-xs`} onClick={onForceNewMezzo}>
              Nuovo mezzo
            </button>
            <button
              type="button"
              className={`${dsBtnNeutral} ${dsFocus} text-xs`}
              onClick={() => setManualSearchOpen((v) => !v)}
            >
              Cerca manualmente
            </button>
            {context.mezzo.decision === "auto_suggest" ? (
              <button type="button" className={`text-xs underline ${dsFocus}`} onClick={onDismiss}>
                Ignora
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {context.mezzo.decision === "choose" && context.mezzo.candidates.length > 1 ? (
        <ul className="space-y-1 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] p-2">
          {context.mezzo.candidates.map((candidate) => (
            <li key={candidate.mezzo.id}>
              <button
                type="button"
                className={`w-full rounded-[var(--ds-radius-md)] px-2 py-2 text-left text-sm hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] ${
                  selectedCandidate?.mezzo.id === candidate.mezzo.id
                    ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
                    : ""
                }`}
                onClick={() => onSelectCandidate(candidate)}
              >
                <span className="font-medium">
                  {formatCaptureMezzoMatchPercent(candidate.percentage)} —{" "}
                  {mezzoIngressoSuggestLabel(candidate.mezzo)}
                </span>
                <CandidateReasonList candidate={candidate} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {manualSearchOpen ? (
        <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] p-2">
          <MezzoSelectionPanel
            catalog={mezziCatalog}
            catalogLoading={catalogLoading ?? false}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleManualSelect}
            userId={userId}
          />
        </div>
      ) : null}
    </div>
  );
}
