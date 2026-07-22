"use client";

import { useCallback, useRef, useState } from "react";
import {
  SchedaSaveConflictDialog,
  useSchedaSaveConflictSelection,
} from "@/components/lavorazioni/schede/scheda-save-conflict-dialog";
import { buildSchedaSaveConflictSummary } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import {
  MEZZO_UPDATE_SCHEDA_ONLY,
  type MezzoUpdateFromSchedaPlan,
} from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { LinkedMezzoSnapshot } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export function useSchedaIngressoSaveGate({
  mezziCatalog,
  linkedSnapshot,
}: {
  mezziCatalog: readonly MezzoGestito[];
  linkedSnapshot: LinkedMezzoSnapshot | null;
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof buildSchedaSaveConflictSummary> | null>(
    null,
  );
  const resolverRef = useRef<((plan: MezzoUpdateFromSchedaPlan | null) => void) | null>(null);
  const selection = useSchedaSaveConflictSelection(summary);

  const gateSave = useCallback(
    (fields: SchedaIngressoFields): Promise<MezzoUpdateFromSchedaPlan> => {
      const mezzo = linkedSnapshot
        ? (mezziCatalog.find((m) => m.id === linkedSnapshot.id) ?? null)
        : null;
      const built = buildSchedaSaveConflictSummary({ fields, linkedSnapshot, mezzo });
      if (!built.hasIssues || !linkedSnapshot) {
        return Promise.resolve(MEZZO_UPDATE_SCHEDA_ONLY);
      }
      selection.initFromSummary(built);
      setSummary(built);
      setOpen(true);
      logMezzoSchedaConflictTelemetry({
        event: "MEZZO_ANAGRAFICA_CONFLICT_SHOWN",
        mezzoId: linkedSnapshot.id,
      });
      return new Promise<MezzoUpdateFromSchedaPlan>((resolve, reject) => {
        resolverRef.current = (plan) => {
          if (plan === null) reject(new Error("SAVE_CANCELLED"));
          else resolve(plan);
        };
      });
    },
    [linkedSnapshot, mezziCatalog, selection],
  );

  const attachOcc = useCallback(
    (plan: MezzoUpdateFromSchedaPlan): MezzoUpdateFromSchedaPlan => {
      if (!linkedSnapshot) return plan;
      return {
        ...plan,
        mezzoOCC: { updatedAtAtLinkTime: linkedSnapshot.mezzoUpdatedAtAtLinkTime },
      };
    },
    [linkedSnapshot],
  );

  const finish = useCallback(
    (plan: MezzoUpdateFromSchedaPlan | null) => {
      setOpen(false);
      setSummary(null);
      resolverRef.current?.(plan ? attachOcc(plan) : plan);
      resolverRef.current = null;
    },
    [attachOcc],
  );

  const dialog = (
    <SchedaSaveConflictDialog
      open={open}
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
          mezzoId: linkedSnapshot?.id,
          choice: "scheda_only",
        });
        finish(MEZZO_UPDATE_SCHEDA_ONLY);
      }}
      onConfirmUpdate={() => {
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_UPDATE_CONFIRMED",
          mezzoId: linkedSnapshot?.id,
          choice: "update_mezzo",
        });
        finish(selection.buildPlan());
      }}
      onCorrect={() => {
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
