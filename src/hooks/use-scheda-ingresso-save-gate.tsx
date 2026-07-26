"use client";

import { useCallback, useRef, useState } from "react";
import { MezzoAssociationChangeDialog } from "@/components/lavorazioni/schede/mezzo-association-change-dialog";
import {
  SchedaSaveConflictDialog,
  useSchedaSaveConflictSelection,
} from "@/components/lavorazioni/schede/scheda-save-conflict-dialog";
import { buildSchedaSaveConflictSummary } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import {
  associationFromScheda,
  checkAssociationChange,
  type AssociationChange,
} from "@/lib/domain/mezzo/mezzo-association";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import {
  MEZZO_UPDATE_SCHEDA_ONLY,
  type MezzoUpdateFromSchedaPlan,
} from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { LinkedMezzoSnapshot } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoSaveGateResult = MezzoUpdateFromSchedaPlan & {
  associationReason?: string;
};

function resolveMezzoForAssociationGate(
  fields: SchedaIngressoFields,
  mezziCatalog: readonly MezzoGestito[],
  linkedSnapshot: LinkedMezzoSnapshot | null,
): MezzoGestito | null {
  const preferred = linkedSnapshot?.id ?? null;
  const resolved = resolveMezzoFromScheda({
    scheda: fields,
    existingMezzi: mezziCatalog,
    preferredMezzoId: preferred,
  });
  if (!resolved.mezzoId) return null;
  return resolved.mezzo ?? mezziCatalog.find((m) => m.id === resolved.mezzoId) ?? null;
}

export function useSchedaIngressoSaveGate({
  mezziCatalog,
  linkedSnapshot,
}: {
  mezziCatalog: readonly MezzoGestito[];
  linkedSnapshot: LinkedMezzoSnapshot | null;
}) {
  const [conflictOpen, setConflictOpen] = useState(false);
  const [associationOpen, setAssociationOpen] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof buildSchedaSaveConflictSummary> | null>(
    null,
  );
  const [associationChange, setAssociationChange] = useState<AssociationChange | null>(null);
  const [resolvedMezzo, setResolvedMezzo] = useState<MezzoGestito | null>(null);
  const resolverRef = useRef<((plan: SchedaIngressoSaveGateResult | null) => void) | null>(null);
  const pendingFieldsRef = useRef<SchedaIngressoFields | null>(null);
  const associationConfirmedRef = useRef(false);
  const selection = useSchedaSaveConflictSelection(summary);

  const attachOcc = useCallback(
    (plan: SchedaIngressoSaveGateResult): SchedaIngressoSaveGateResult => {
      const occAt =
        linkedSnapshot?.mezzoUpdatedAtAtLinkTime ??
        resolvedMezzo?.ultimaModifica?.trim() ??
        "";
      if (!occAt) return plan;
      return {
        ...plan,
        mezzoOCC: { updatedAtAtLinkTime: occAt },
      };
    },
    [linkedSnapshot, resolvedMezzo],
  );

  const finish = useCallback(
    (plan: SchedaIngressoSaveGateResult | null) => {
      setConflictOpen(false);
      setAssociationOpen(false);
      setSummary(null);
      setAssociationChange(null);
      setResolvedMezzo(null);
      pendingFieldsRef.current = null;
      associationConfirmedRef.current = false;
      resolverRef.current?.(plan ? attachOcc(plan) : plan);
      resolverRef.current = null;
    },
    [attachOcc],
  );

  const runGenericConflictGate = useCallback(
    (fields: SchedaIngressoFields, mezzo: MezzoGestito | null) => {
      const built = buildSchedaSaveConflictSummary({ fields, linkedSnapshot, mezzo });
      if (!built.hasIssues) {
        const base: SchedaIngressoSaveGateResult = associationConfirmedRef.current
          ? { ...MEZZO_UPDATE_SCHEDA_ONLY, associationChangeConfirmed: true }
          : MEZZO_UPDATE_SCHEDA_ONLY;
        finish(base);
        return;
      }
      selection.initFromSummary(built);
      setSummary(built);
      setConflictOpen(true);
      logMezzoSchedaConflictTelemetry({
        event: "MEZZO_ANAGRAFICA_CONFLICT_SHOWN",
        mezzoId: mezzo?.id ?? linkedSnapshot?.id,
      });
    },
    [finish, linkedSnapshot, selection],
  );

  const gateSave = useCallback(
    (fields: SchedaIngressoFields): Promise<SchedaIngressoSaveGateResult> => {
      const mezzo = resolveMezzoForAssociationGate(fields, mezziCatalog, linkedSnapshot);
      const association = checkAssociationChange({
        existingMezzo: mezzo,
        incoming: associationFromScheda(fields),
      });

      return new Promise<SchedaIngressoSaveGateResult>((resolve, reject) => {
        resolverRef.current = (plan) => {
          if (plan === null) reject(new Error("SAVE_CANCELLED"));
          else resolve(plan);
        };
        pendingFieldsRef.current = fields;
        setResolvedMezzo(mezzo);

        if (association.requiresConfirmation) {
          setAssociationChange(association);
          setAssociationOpen(true);
          logMezzoSchedaConflictTelemetry({
            event: "MEZZO_ASSOCIATION_CHANGE_SHOWN",
            mezzoId: mezzo?.id,
          });
          return;
        }

        runGenericConflictGate(fields, mezzo);
      });
    },
    [linkedSnapshot, mezziCatalog, runGenericConflictGate],
  );

  const onAssociationConfirm = useCallback(() => {
    associationConfirmedRef.current = true;
    setAssociationOpen(false);
    const fields = pendingFieldsRef.current;
    if (!fields) {
      finish(null);
      return;
    }
    logMezzoSchedaConflictTelemetry({
      event: "MEZZO_ASSOCIATION_CHANGE_CONFIRMED",
      mezzoId: resolvedMezzo?.id,
    });
    runGenericConflictGate(fields, resolvedMezzo);
  }, [finish, resolvedMezzo, runGenericConflictGate]);

  const dialog = (
    <>
      <MezzoAssociationChangeDialog
        open={associationOpen}
        change={associationChange}
        onConfirm={onAssociationConfirm}
        onCancel={() => {
          logMezzoSchedaConflictTelemetry({
            event: "MEZZO_ASSOCIATION_CHANGE_REJECTED",
            mezzoId: resolvedMezzo?.id,
          });
          finish(null);
        }}
      />
      <SchedaSaveConflictDialog
        open={conflictOpen}
        summary={summary}
        selectedFields={selection.selectedFields}
        selectedMeteringKm={selection.selectedMeteringKm}
        selectedMeteringOre={selection.selectedMeteringOre}
        onToggleField={selection.toggleField}
        onToggleMeteringKm={selection.toggleMeteringKm}
        onToggleMeteringOre={selection.toggleMeteringOre}
        onSaveInterventoOnly={() => {
          logMezzoSchedaConflictTelemetry({
            event: "MEZZO_UPDATE_CONFIRMED",
            mezzoId: linkedSnapshot?.id ?? resolvedMezzo?.id,
            choice: "scheda_only",
          });
          finish(MEZZO_UPDATE_SCHEDA_ONLY);
        }}
        onConfirmUpdate={() => {
          logMezzoSchedaConflictTelemetry({
            event: "MEZZO_UPDATE_CONFIRMED",
            mezzoId: linkedSnapshot?.id ?? resolvedMezzo?.id,
            choice: "update_mezzo",
          });
          const plan = selection.buildPlan();
          finish({
            ...plan,
            associationChangeConfirmed: associationConfirmedRef.current || undefined,
          });
        }}
        onCorrect={() => {
          logMezzoSchedaConflictTelemetry({
            event: "MEZZO_UPDATE_REJECTED",
            mezzoId: linkedSnapshot?.id ?? resolvedMezzo?.id,
          });
          finish(null);
        }}
      />
    </>
  );

  return { gateSave, dialog };
}
