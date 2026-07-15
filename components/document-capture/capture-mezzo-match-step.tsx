"use client";

import { useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CAPTURE_REVIEW_PIN_TOP_CLASS } from "@/components/document-capture/capture-review-panel";
import {
  describeCaptureLavorazioneAssignTarget,
  findActiveLavorazioneWithIngressoForCaptureIdent,
  formatCaptureIdentSummary,
  resolveCaptureIdentFromFields,
  type CaptureIdent,
} from "@/lib/document-capture/capture-lavorazione-match";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

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
}) {
  const [manualPickOpen, setManualPickOpen] = useState(false);
  const [identSearch, setIdentSearch] = useState("");

  const ident = useMemo(() => resolveCaptureIdentFromFields(fieldRows), [fieldRows]);
  const match = useMemo(
    () => findActiveLavorazioneWithIngressoForCaptureIdent(ident, mezzi, schedeStore, attive),
    [attive, ident, mezzi, schedeStore],
  );

  const schedaLabel = schedaTipo === "ricambi" ? "scheda ricambi" : "scheda lavorazioni";

  const filteredAttive = useMemo(() => {
    const q = identSearch.trim().toLowerCase();
    if (!q) return [...attive];
    return attive.filter((lav) => {
      const label = describeCaptureLavorazioneAssignTarget(lav.id, attive, schedeStore).toLowerCase();
      return label.includes(q) || lav.id.includes(q);
    });
  }, [attive, identSearch, schedeStore]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className={`lg:sticky ${CAPTURE_REVIEW_PIN_TOP_CLASS} lg:z-[1] lg:self-start`}>
        <CaptureDocumentFilePreview captureId={captureId} pinned />
      </div>
      <div className="space-y-4 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-4">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--cab-fg)]">Conferma mezzo</h3>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
            Identificativi letti dalla {schedaLabel}:{" "}
            <span className="font-medium text-[color:var(--cab-fg)]">{formatCaptureIdentSummary(ident)}</span>
          </p>
        </div>

        {match ? (
          <div className="space-y-3 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-accent)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_8%,var(--cab-surface))] p-3">
            <p className="text-sm text-[color:var(--cab-fg)]">
              Trovata lavorazione in corso con scheda ingresso corrispondente:
            </p>
            <p className="text-sm font-medium text-[color:var(--cab-fg)]">
              {describeCaptureLavorazioneAssignTarget(match.lavorazioneId, attive, schedeStore)}
            </p>
            <LoadingButton
              type="button"
              variant="primary"
              className={`${erpBtnAccent} w-full sm:w-auto`}
              loading={assignBusy}
              loadingLabel="Assegnazione…"
              onClick={() => onAssign(match.lavorazioneId)}
            >
              Assegna a questa lavorazione
            </LoadingButton>
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
              <button
                type="button"
                className={`${erpBtnNeutral} min-h-10`}
                onClick={() => setManualPickOpen((v) => !v)}
              >
                Assegna manualmente
              </button>
            </div>
            {manualPickOpen ? (
              <div className="space-y-2 rounded-lg border border-[color:var(--cab-border)] p-3">
                <label className="block text-xs font-medium text-[color:var(--cab-fg)]">
                  Cerca lavorazione in corso
                  <input
                    type="search"
                    className="mt-1 block w-full rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1.5 text-sm"
                    value={identSearch}
                    onChange={(e) => setIdentSearch(e.target.value)}
                    placeholder="Cliente, codice, targa…"
                  />
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {filteredAttive.length === 0 ? (
                    <li className="text-xs text-[color:var(--cab-text-muted)]">Nessuna lavorazione in corso.</li>
                  ) : (
                    filteredAttive.map((lav) => (
                      <li key={lav.id}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left hover:bg-[var(--cab-surface-2)]"
                          disabled={assignBusy}
                          onClick={() => onAssign(lav.id)}
                        >
                          {describeCaptureLavorazioneAssignTarget(lav.id, attive, schedeStore)}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export type { CaptureIdent };
