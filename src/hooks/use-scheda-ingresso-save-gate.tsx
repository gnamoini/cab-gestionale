"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MezzoAnagraficaConfirmDialog } from "@/components/lavorazioni/schede/scheda-save-conflict-dialog";
import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { isMezzoAssociationField } from "@/lib/domain/mezzo/mezzo-association";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import {
  MEZZO_UPDATE_SCHEDA_ONLY,
  type MezzoUpdateFromSchedaPlan,
} from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { isMezzoSnapshotStale } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { LinkedMezzoSnapshot } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";
import type { MezzoAnagraficaChange } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type SchedaIngressoSaveGateResult = MezzoUpdateFromSchedaPlan & {
  associationReason?: string;
};

function buildPlanFromChanges(
  changes: MezzoAnagraficaChange[],
  mezzoStale: boolean,
): MezzoUpdateFromSchedaPlan {
  return {
    updateAnagrafica: changes.length > 0,
    fieldsToUpdate: changes.map((c) => c.field),
    updateMetering: false,
    meteringFields: [],
    associationChangeConfirmed: changes.some((c) => isMezzoAssociationField(c.field)),
    forceDespiteStale: mezzoStale,
  };
}

export function useSchedaIngressoSaveGate({
  mezziCatalog,
  linkedSnapshot,
  skipFields = [],
}: {
  mezziCatalog: readonly MezzoGestito[];
  linkedSnapshot: LinkedMezzoSnapshot | null;
  /** Campi già decisi al link capture — non riproporre in save gate. */
  skipFields?: readonly MezzoPermanentFieldKey[];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changes, setChanges] = useState<MezzoAnagraficaChange[]>([]);
  const [mezzoStale, setMezzoStale] = useState(false);
  const resolverRef = useRef<((plan: SchedaIngressoSaveGateResult | null) => void) | null>(null);
  const resolvedMezzoRef = useRef<MezzoGestito | null>(null);
  const pendingDialogRef = useRef<{ changes: MezzoAnagraficaChange[]; mezzoStale: boolean }>({
    changes: [],
    mezzoStale: false,
  });

  const attachOcc = useCallback(
    (plan: SchedaIngressoSaveGateResult): SchedaIngressoSaveGateResult => {
      const mezzo = resolvedMezzoRef.current;
      const occAt =
        linkedSnapshot?.mezzoUpdatedAtAtLinkTime ?? mezzo?.ultimaModifica?.trim() ?? "";
      if (!occAt) return plan;
      return {
        ...plan,
        mezzoOCC: { updatedAtAtLinkTime: occAt },
      };
    },
    [linkedSnapshot],
  );

  const finish = useCallback(
    (plan: SchedaIngressoSaveGateResult | null) => {
      setConfirmOpen(false);
      setChanges([]);
      setMezzoStale(false);
      pendingDialogRef.current = { changes: [], mezzoStale: false };
      resolvedMezzoRef.current = null;
      const resolver = resolverRef.current;
      resolverRef.current = null;
      resolver?.(plan ? attachOcc(plan) : plan);
    },
    [attachOcc],
  );

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        finish(null);
      }
    };
  }, [finish]);

  const gateSave = useCallback(
    (fields: SchedaIngressoFields): Promise<SchedaIngressoSaveGateResult> => {
      return new Promise<SchedaIngressoSaveGateResult>((resolve, reject) => {
        if (resolverRef.current) {
          reject(new Error("SAVE_IN_PROGRESS"));
          return;
        }

        resolverRef.current = (plan) => {
          if (plan === null) reject(new Error("SAVE_CANCELLED"));
          else resolve(plan);
        };

        if (!linkedSnapshot) {
          finish(MEZZO_UPDATE_SCHEDA_ONLY);
          return;
        }

        const mezzo =
          mezziCatalog.find((m) => m.id === linkedSnapshot.id) ?? null;
        resolvedMezzoRef.current = mezzo;

        const detected = detectMezzoAnagraficaChanges(
          linkedSnapshot.fieldsAtLinkTime,
          fields,
        );
        const skipSet = new Set(skipFields);
        const filteredChanges = detected.changes.filter((c) => !skipSet.has(c.field));
        const stale = isMezzoSnapshotStale(linkedSnapshot, mezzo);

        if (filteredChanges.length === 0 && !stale) {
          finish(MEZZO_UPDATE_SCHEDA_ONLY);
          return;
        }

        pendingDialogRef.current = { changes: filteredChanges, mezzoStale: stale };
        setChanges(filteredChanges);
        setMezzoStale(stale);
        setConfirmOpen(true);
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_ANAGRAFICA_CONFLICT_SHOWN",
          mezzoId: linkedSnapshot.id,
        });
      });
    },
    [finish, linkedSnapshot, mezziCatalog, skipFields],
  );

  const dialog = (
    <MezzoAnagraficaConfirmDialog
      open={confirmOpen}
      changes={changes}
      mezzoStale={mezzoStale}
      onConfirm={() => {
        const pending = pendingDialogRef.current;
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_UPDATE_CONFIRMED",
          mezzoId: linkedSnapshot?.id,
          choice: "update_mezzo",
        });
        finish(buildPlanFromChanges(pending.changes, pending.mezzoStale));
      }}
      onCancel={() => {
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_UPDATE_REJECTED",
          mezzoId: linkedSnapshot?.id,
        });
        finish(null);
      }}
    />
  );

  return { gateSave, dialog };
}
