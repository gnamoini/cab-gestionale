"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CaptureReviewSplitLayout } from "@/components/document-capture/capture-review-panel";
import {
  describeCaptureLavorazioneAssignTarget,
  findActiveLavorazioneWithIngressoForCaptureIdent,
  formatCaptureIdentSummary,
  resolveCaptureIdentFromFields,
  type CaptureIdent,
} from "@/lib/document-capture/capture-lavorazione-match";
import {
  clearManualAssignSelection,
  completeManualAssignReview,
  describeLavorazioneAssignRowParts,
  filterAttiveForManualAssign,
  manualAssignSelectedId,
  resolveInitialManualAssignState,
  revertManualAssigning,
  selectManualAssignLavorazione,
  startManualAssign,
  type ManualAssignState,
} from "@/lib/document-capture/capture-manual-assign-state";
import {
  CAPTURE_ASSIGN_CALLOUT_CLASS,
  LavorazioneAssignLabelLines,
} from "@/components/document-capture/capture-lavorazione-assign-label";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { useSelectorListboxKeyboard } from "@/lib/selector-interaction/use-selector-listbox-keyboard";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { globalAutocompleteOptionClass } from "@/lib/ui/global-input";
import { dsSearchFieldInput } from "@/lib/ui/design-system";

const SEARCH_DEBOUNCE_MS = 180;

const CAPTURE_CALLOUT_ACCENT =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-accent)_25%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_6%,var(--cab-surface))]";

function ManualAssignRowBadge({
  state,
  lavorazioneId,
  attive,
  schedeStore,
}: {
  state: ManualAssignState;
  lavorazioneId: string;
  attive: readonly LavorazioneAttiva[];
  schedeStore: LavorazioneSchedeStore;
}) {
  const parts = describeLavorazioneAssignRowParts(lavorazioneId, attive, schedeStore);
  const codice = parts.codice || "lavorazione in corso";

  if (state.status === "assigning" && state.id === lavorazioneId) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[color:var(--cab-primary)]">
        <LoadingSpinner size="sm" />
        Collegamento…
      </span>
    );
  }
  if (state.status === "review" && state.id === lavorazioneId) {
    return (
      <span className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--cab-accent)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-accent-fg)]">
        ✓ Collegata · {codice}
      </span>
    );
  }
  if (state.status === "selected" && state.id === lavorazioneId) {
    return (
      <span className="shrink-0 text-xs font-semibold text-[color:var(--cab-primary)]">✓ Selezionata</span>
    );
  }
  return null;
}

function CaptureManualAssignPicker({
  attive,
  schedeStore,
  assignState,
  onSelect,
  onConfirmAssign,
  onEscape,
  assignBusy,
  reviewPending,
  listboxId,
}: {
  attive: readonly LavorazioneAttiva[];
  schedeStore: LavorazioneSchedeStore;
  assignState: ManualAssignState;
  onSelect: (id: string) => void;
  onConfirmAssign: (id: string) => void;
  onEscape: () => void;
  assignBusy: boolean;
  reviewPending: boolean;
  listboxId: string;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const labelFor = useCallback(
    (id: string) => describeCaptureLavorazioneAssignTarget(id, attive, schedeStore),
    [attive, schedeStore],
  );

  const filteredAttive = useMemo(
    () => filterAttiveForManualAssign(attive, debouncedSearch, labelFor) as LavorazioneAttiva[],
    [attive, debouncedSearch, labelFor],
  );

  const selectedId = manualAssignSelectedId(assignState);
  const canConfirm =
    assignState.status === "selected" && selectedId !== null && !assignBusy;

  const handleEnter = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < filteredAttive.length) {
      const id = filteredAttive[activeIndex]!.id;
      if (assignState.status === "selected" && assignState.id === id) {
        onConfirmAssign(id);
      } else {
        onSelect(id);
      }
      return;
    }
    if (canConfirm && selectedId) {
      onConfirmAssign(selectedId);
    }
  }, [
    activeIndex,
    assignState,
    canConfirm,
    filteredAttive,
    onConfirmAssign,
    onSelect,
    selectedId,
  ]);

  const handleListKeyDown = useSelectorListboxKeyboard({
    open: true,
    totalNavigableOptions: filteredAttive.length,
    activeIndex,
    setOpen: () => {},
    setActiveIndex,
    onEscape,
    onEnter: handleEnter,
  });

  useEffect(() => {
    if (!selectedId) return;
    const idx = filteredAttive.findIndex((lav) => lav.id === selectedId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (idx >= 0) setActiveIndex(idx);
  }, [filteredAttive, selectedId]);

  const selectedParts =
    selectedId !== null
      ? describeLavorazioneAssignRowParts(selectedId, attive, schedeStore)
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        <h4 className="text-sm font-semibold text-[color:var(--cab-fg)]">Scegli lavorazione</h4>
        <span className="text-xs text-[color:var(--cab-text-muted)]">
          {attive.length} lavorazioni in corso
        </span>
      </div>
      <label className="block text-xs font-medium text-[color:var(--cab-fg)]">
        Cerca
        <input
          type="search"
          className={`${dsSearchFieldInput} mt-1 block w-full min-w-0`}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleListKeyDown}
          placeholder="Cliente, codice, targa…"
          aria-controls={listboxId}
        />
      </label>
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Lavorazioni in corso"
        className="gestionale-scrollbar max-h-56 space-y-1 overflow-y-auto"
        onKeyDown={handleListKeyDown}
      >
        {filteredAttive.length === 0 ? (
          <li className="px-2 py-3 text-xs text-[color:var(--cab-text-muted)]">
            Nessuna lavorazione in corso. Prova a modificare la ricerca.
          </li>
        ) : (
          filteredAttive.map((lav, idx) => {
            const parts = describeLavorazioneAssignRowParts(lav.id, attive, schedeStore);
            const isSelected =
              manualAssignSelectedId(assignState) === lav.id ||
              (assignState.status === "review" && assignState.id === lav.id);
            const isActive = idx === activeIndex;
            const primary = parts.headlineLine || labelFor(lav.id);
            return (
              <li key={lav.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={assignState.status === "assigning"}
                  className={`${globalAutocompleteOptionClass(isActive, isSelected)} !min-h-11 !text-left`}
                  onClick={() => onSelect(lav.id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{primary}</span>
                      {parts.identLine ? (
                        <span className="mt-0.5 block truncate text-xs font-normal text-[color:var(--cab-text-muted)]">
                          {parts.identLine}
                        </span>
                      ) : null}
                    </span>
                    <ManualAssignRowBadge
                      state={assignState}
                      lavorazioneId={lav.id}
                      attive={attive}
                      schedeStore={schedeStore}
                    />
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      {selectedId && selectedParts ? (
        <div className={`space-y-2 p-3 ${CAPTURE_ASSIGN_CALLOUT_CLASS}`}>
          <p className="text-xs font-medium text-[color:var(--cab-fg)]">Riepilogo selezione</p>
          <LavorazioneAssignLabelLines parts={selectedParts} fallback={labelFor(selectedId)} />
          {assignState.status === "review" && reviewPending ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Lavorazione collegata. Verifica i campi evidenziati e usa &quot;Procedi comunque&quot; per
              completare l&apos;importazione.
            </p>
          ) : null}
          {assignState.status === "selected" ? (
            <LoadingButton
              type="button"
              variant="primary"
              className={`${erpBtnAccent} w-full sm:w-auto`}
              loading={assignBusy}
              loadingLabel="Collegamento…"
              onClick={() => onConfirmAssign(selectedId)}
            >
              Conferma assegnazione
            </LoadingButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CaptureMezzoMatchStep({
  captureId,
  fieldRows,
  schedaTipo,
  mezzi = [],
  schedeStore = {},
  attive = [],
  onAssign,
  onCreateNew,
  onCancel,
  assignBusy = false,
  pendingAssignLavorazioneId = null,
  reviewPending = false,
}: {
  captureId: string;
  fieldRows: readonly CaptureFieldRow[];
  schedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi">;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  onAssign: (lavorazioneId: string) => void;
  onCreateNew: () => void;
  onCancel: () => void;
  assignBusy?: boolean;
  pendingAssignLavorazioneId?: string | null;
  reviewPending?: boolean;
}) {
  const listboxId = useId();
  const ident = useMemo(() => resolveCaptureIdentFromFields(fieldRows), [fieldRows]);
  const match = useMemo(
    () => findActiveLavorazioneWithIngressoForCaptureIdent(ident, mezzi, schedeStore, attive),
    [attive, ident, mezzi, schedeStore],
  );

  const [manualPickOpen, setManualPickOpen] = useState(!match);
  const [assignState, setAssignState] = useState<ManualAssignState>(() =>
    resolveInitialManualAssignState(pendingAssignLavorazioneId),
  );
  const prevAssignBusy = useRef(assignBusy);

  const schedaLabel = schedaTipo === "ricambi" ? "scheda ricambi" : "scheda lavorazioni";

  useEffect(() => {
    if (pendingAssignLavorazioneId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setAssignState(completeManualAssignReview(pendingAssignLavorazioneId));
      setManualPickOpen(true);
    }
  }, [pendingAssignLavorazioneId]);

  useEffect(() => {
    if (assignBusy && !prevAssignBusy.current) {
      setAssignState((prev) => {
        const id = manualAssignSelectedId(prev);
        if (id) return startManualAssign(prev, id);
        return prev;
      });
    }
    if (!assignBusy && prevAssignBusy.current) {
      setAssignState((prev) => {
        if (prev.status === "assigning" && !pendingAssignLavorazioneId) {
          return revertManualAssigning(prev);
        }
        return prev;
      });
    }
    prevAssignBusy.current = assignBusy;
  }, [assignBusy, pendingAssignLavorazioneId]);

  const handleSelect = useCallback((id: string) => {
    setAssignState((prev) => selectManualAssignLavorazione(prev, id));
  }, []);

  const handleConfirmAssign = useCallback(
    (id: string) => {
      setAssignState(startManualAssign(assignState, id));
      onAssign(id);
    },
    [assignState, onAssign],
  );

  const handleManualEscape = useCallback(() => {
    if (assignState.status === "review") return;
    if (match && manualPickOpen) {
      setManualPickOpen(false);
      setAssignState((prev) => clearManualAssignSelection(prev));
      return;
    }
    setAssignState((prev) => clearManualAssignSelection(prev));
  }, [assignState.status, manualPickOpen, match]);

  const suggestedParts = match
    ? describeLavorazioneAssignRowParts(match.lavorazioneId, attive, schedeStore)
    : null;
  const suggestedAssigning =
    assignBusy && match !== null && manualAssignSelectedId(assignState) === match.lavorazioneId;

  return (
    <CaptureReviewSplitLayout
      preview={<CaptureDocumentFilePreview captureId={captureId} pinned />}
      review={
        <div className="min-w-0 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--cab-fg)]">Conferma mezzo</h3>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
            Identificativi letti dalla {schedaLabel}:{" "}
            <span className="font-medium text-[color:var(--cab-fg)]">{formatCaptureIdentSummary(ident)}</span>
          </p>
        </div>

        {match ? (
          <div className="space-y-4">
            <div role="status" className={`space-y-3 p-3 sm:p-3.5 ${CAPTURE_CALLOUT_ACCENT}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-accent-fg)]">
                <span aria-hidden>✓ </span>
                Lavorazione suggerita
              </p>
              <LavorazioneAssignLabelLines
                parts={suggestedParts}
                fallback={describeCaptureLavorazioneAssignTarget(match.lavorazioneId, attive, schedeStore)}
                headlineClassName="text-sm font-medium leading-snug text-[color:var(--cab-fg)]"
              />
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Identificativi coincidenti con la scheda letta.
              </p>
              <LoadingButton
                type="button"
                variant="primary"
                className={`${erpBtnAccent} w-full sm:w-auto`}
                loading={suggestedAssigning}
                loadingLabel="Collegamento…"
                disabled={assignBusy && !suggestedAssigning}
                onClick={() => {
                  setAssignState(startManualAssign(assignState, match.lavorazioneId));
                  onAssign(match.lavorazioneId);
                }}
              >
                Usa questa
              </LoadingButton>
            </div>
            <div className="relative flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[color:var(--cab-border)] min-w-0" aria-hidden />
              <span className="shrink-0 text-xs text-[color:var(--cab-text-muted)]">oppure</span>
              <div className="h-px flex-1 bg-[color:var(--cab-border)] min-w-0" aria-hidden />
            </div>
            {!manualPickOpen ? (
              <button
                type="button"
                className={`${erpBtnNeutral} min-h-10 w-full`}
                onClick={() => setManualPickOpen(true)}
              >
                Scegli una lavorazione diversa
              </button>
            ) : (
              <CaptureManualAssignPicker
                attive={attive}
                schedeStore={schedeStore}
                assignState={assignState}
                onSelect={handleSelect}
                onConfirmAssign={handleConfirmAssign}
                onEscape={handleManualEscape}
                assignBusy={assignBusy}
                reviewPending={reviewPending}
                listboxId={listboxId}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--cab-text-muted)]">
              Nessuna lavorazione in corso con scheda ingresso corrispondente a questi identificativi.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className={`${erpBtnNeutral} min-h-10`} onClick={onCancel}>
                Annulla
              </button>
              <button type="button" className={`${erpBtnAccent} min-h-10`} onClick={onCreateNew}>
                Crea nuova lavorazione
              </button>
            </div>
            <CaptureManualAssignPicker
              attive={attive}
              schedeStore={schedeStore}
              assignState={assignState}
              onSelect={handleSelect}
              onConfirmAssign={handleConfirmAssign}
              onEscape={handleManualEscape}
              assignBusy={assignBusy}
              reviewPending={reviewPending}
              listboxId={listboxId}
            />
          </div>
        )}
        </div>
      }
    />
  );
}

export type { CaptureIdent, ManualAssignState };
