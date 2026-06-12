"use client";

import { useEffect, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { dsBtnNeutral, dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import {
  describeSchedaIngressoMatchLabel,
  type LastSchedaIngressoMatch,
} from "@/lib/schede/scheda-ingresso-reuse";

export function SchedaIngressoCopyPickDialog({
  open,
  candidates,
  title = "Più schede ingresso trovate",
  confirmLabel = "Copia selezionata",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  candidates: readonly LastSchedaIngressoMatch[];
  title?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (match: LastSchedaIngressoMatch) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      return;
    }
    setSelectedId(candidates[0]?.sourceLavorazioneId ?? null);
  }, [open, candidates]);

  const selected = candidates.find((c) => c.sourceLavorazioneId === selectedId) ?? null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title={title}
      layerClassName={cabModalZConfirm}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <button type="button" className={`${dsBtnNeutral} min-h-11 sm:min-h-0`} onClick={onCancel}>
            Annulla
          </button>
          <button
            type="button"
            className={`${dsBtnPrimary} min-h-11 sm:min-h-0`}
            disabled={!selected}
            onClick={() => {
              if (selected) onConfirm(selected);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
        Per questo identificativo (targa, matricola o n. scuderia) ci sono{" "}
        <span className="font-semibold text-[color:var(--cab-text)]">{candidates.length}</span> schede
        ingresso precedenti. Scegli quale copiare.
      </p>
      <ul className="mt-3 max-h-[min(50vh,18rem)] space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
        {candidates.map((match) => {
          const active = match.sourceLavorazioneId === selectedId;
          return (
            <li key={match.sourceLavorazioneId}>
              <button
                type="button"
                className={`w-full rounded-[var(--ds-radius-lg)] border px-3 py-2.5 text-left text-sm transition-colors ${dsFocus} ${
                  active
                    ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]"
                    : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] hover:bg-[var(--cab-hover)]"
                }`}
                onClick={() => setSelectedId(match.sourceLavorazioneId)}
              >
                <span className="block font-medium text-[color:var(--cab-text)]">
                  {describeSchedaIngressoMatchLabel(match)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </GestionaleConfirmDialog>
  );
}
