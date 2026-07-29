"use client";

import {
  GestionaleConfirmDialog,
  gestionaleConfirmActionsClass,
} from "@/components/gestionale/gestionale-confirm-dialog";
import {
  describeRegistryUpdateRows,
  type MezzoRegistryUpdatePlan,
} from "@/lib/document-capture/capture-mezzo-registry-update-plan";
import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export function CaptureMezzoRegistryConfirmDialog({
  open,
  mezzo,
  plan,
  mergeResult,
  onUpdateRegistry,
  onSchedaOnly,
  onCancel,
}: {
  open: boolean;
  mezzo: MezzoGestito;
  plan: MezzoRegistryUpdatePlan;
  mergeResult: CaptureIngressoMergeResult;
  onUpdateRegistry: () => void;
  onSchedaOnly: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const rows = describeRegistryUpdateRows(plan, mergeResult);

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Aggiornare il record mezzo?"
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <button type="button" className={dsBtnNeutral} onClick={onSchedaOnly}>
            Usa solo nella scheda
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onUpdateRegistry}>
            Aggiorna record mezzo
          </button>
        </div>
      }
    >
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Mezzo trovato: <span className="font-medium text-[color:var(--cab-fg)]">{mezzoIngressoSuggestLabel(mezzo)}</span>
      </p>
      {rows.length > 0 ? (
        <>
          <p className="mt-3 text-sm text-[color:var(--cab-fg)]">Dati permanenti nuovi dalla scansione:</p>
          <ul className="mt-2 space-y-1 text-sm">
            {rows.map((row) => (
              <li key={row.label} className="text-[color:var(--cab-text-muted)]">
                ✓ {row.label}
                {row.value ? `: ${row.value}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">
          Nessun dato permanente nuovo da propagare al registro mezzi.
        </p>
      )}
    </GestionaleConfirmDialog>
  );
}
