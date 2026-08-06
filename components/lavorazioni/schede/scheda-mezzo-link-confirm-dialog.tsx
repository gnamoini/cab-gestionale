"use client";

import {
  GestionaleConfirmDialog,
  gestionaleConfirmActionsClass,
} from "@/components/gestionale/gestionale-confirm-dialog";
import {
  describeIngressoMezzoMatchConfidence,
  type IngressoMezzoScoredCandidate,
  type MatchConfidence,
} from "@/lib/schede/scheda-ingresso-mezzo-match";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsBtnPrimary, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

function dialogTitle(confidence: MatchConfidence, ambiguous: boolean): string {
  if (ambiguous) return "Più mezzi compatibili";
  if (confidence === "certain" || confidence === "high") {
    return "Mezzo con identificativo certo";
  }
  if (confidence === "medium") {
    return "Mezzo compatibile trovato";
  }
  return "Possibile mezzo compatibile";
}

function dialogMessage(confidence: MatchConfidence, ambiguous: boolean): string {
  if (ambiguous) {
    return "Sono stati trovati più mezzi compatibili con i dati inseriti. Seleziona il mezzo corretto oppure crea un nuovo mezzo.";
  }
  if (confidence === "certain" || confidence === "high") {
    return "È stato trovato un mezzo già presente con identificativo certo. Vuoi collegare la scheda al mezzo esistente oppure creare un nuovo mezzo?";
  }
  if (confidence === "medium") {
    return "È stato trovato un mezzo compatibile con matricola e cliente. Vuoi collegare la scheda al mezzo esistente oppure creare un nuovo mezzo?";
  }
  return "È stato trovato un possibile mezzo compatibile. Vuoi collegare la scheda al mezzo esistente oppure creare un nuovo mezzo?";
}

export function SchedaMezzoLinkConfirmDialog({
  open,
  mode,
  confidence,
  candidate,
  candidates,
  onLinkExisting,
  onCreateNew,
  onSelectCandidate,
  onCancel,
}: {
  open: boolean;
  mode: "confirm" | "pick";
  confidence: MatchConfidence;
  candidate?: MezzoGestito | null;
  candidates?: readonly IngressoMezzoScoredCandidate[];
  onLinkExisting?: () => void;
  onCreateNew: () => void;
  onSelectCandidate?: (mezzo: MezzoGestito) => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const ambiguous = mode === "pick";
  const title = dialogTitle(confidence, ambiguous);
  const message = dialogMessage(confidence, ambiguous);

  return (
    <GestionaleConfirmDialog
      open={open}
      title={title}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <button type="button" className={dsBtnNeutral} onClick={onCreateNew}>
            Crea nuovo mezzo
          </button>
          {mode === "confirm" && candidate && onLinkExisting ? (
            <button type="button" className={dsBtnPrimary} onClick={onLinkExisting}>
              Collega mezzo esistente
            </button>
          ) : null}
        </div>
      }
    >
      <p className="text-sm text-[color:var(--cab-text-muted)]">{message}</p>
      {mode === "confirm" && candidate ? (
        <p className="mt-2 text-sm text-[color:var(--cab-fg)]">
          <span className="font-medium">{mezzoIngressoSuggestLabel(candidate)}</span>
          <span className="mt-1 block text-xs text-[color:var(--cab-text-muted)]">
            {describeIngressoMezzoMatchConfidence(confidence)}
          </span>
        </p>
      ) : null}
      {mode === "pick" && candidates && candidates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {candidates.map((c) => (
            <li key={c.mezzo.id}>
              <button
                type="button"
                className={`${dsBtnSoftOrange} ${dsFocus} w-full text-left text-sm`}
                onClick={() => onSelectCandidate?.(c.mezzo)}
              >
                {mezzoIngressoSuggestLabel(c.mezzo)}
                <span className="mt-0.5 block text-xs text-[color:var(--cab-text-muted)]">
                  Score {c.score} · {c.matchedFields.join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </GestionaleConfirmDialog>
  );
}
