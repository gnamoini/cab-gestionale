"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { completeLavorazioneTagliandoAction } from "@/src/actions/complete-lavorazione-tagliando";
import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";
import type { TagliandoNoPresetChoice } from "@/components/gestionale/lavorazioni/tagliando-no-preset-dialog";
import type { CompleteLavorazioneTagliandoResult } from "@/lib/maintenance-plans/complete-lavorazione-tagliando.server";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { maintenanceEngineV2QueryKeys } from "@/src/hooks/gestionale/use-maintenance-engine-v2";

export type TagliandoStatoMoveRow = {
  id: string;
  is_tagliando?: boolean | null;
  tagliando_preset_ref?: string | null;
  mezzo_id: string;
};

export function useLavorazioneTagliandoStatoMove({
  moveStato,
  hasMezzoPresetConfig,
}: {
  moveStato: (lavorazioneId: string, nextStato: string) => boolean;
  hasMezzoPresetConfig: (row: TagliandoStatoMoveRow) => boolean;
}) {
  const qc = useQueryClient();
  const [noPresetDialogOpen, setNoPresetDialogOpen] = useState(false);
  const [pendingRow, setPendingRow] = useState<TagliandoStatoMoveRow | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompleteLavorazioneTagliandoResult | null>(null);

  const invalidateMezzoTagliandi = useCallback(
    (mezzoId: string) => {
      const id = mezzoId.trim();
      if (!id) return;
      void qc.invalidateQueries({ queryKey: maintenancePlansQueryKeys.mezzoHistory(id) });
      void qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.mezzoConfigs(id) });
      void qc.invalidateQueries({ queryKey: maintenanceEngineV2QueryKeys.timelineExtras(id) });
    },
    [qc],
  );

  const runTagliandoCompletion = useCallback(
    async (row: TagliandoStatoMoveRow, noPresetReason?: string) => {
      const result = await completeLavorazioneTagliandoAction({
        lavorazioneId: row.id,
        noPresetReason,
      });
      setLastCompletion(result);
      if (result.ok) invalidateMezzoTagliandi(row.mezzo_id);
      return result;
    },
    [invalidateMezzoTagliandi],
  );

  const moveStatoWithTagliando = useCallback(
    async (row: TagliandoStatoMoveRow, nextStato: string) => {
      const isCompletata = nextStato === STATO_LAVORAZIONE_COMPLETATA_ID;
      if (!row.is_tagliando || !isCompletata) {
        moveStato(row.id, nextStato);
        return;
      }

      const hasPreset = Boolean(row.tagliando_preset_ref) || hasMezzoPresetConfig(row);
      if (!hasPreset) {
        setPendingRow(row);
        setNoPresetDialogOpen(true);
        return;
      }

      const result = await runTagliandoCompletion(row);
      if (!result.ok) return;
      moveStato(row.id, nextStato);
    },
    [hasMezzoPresetConfig, moveStato, runTagliandoCompletion],
  );

  const handleNoPresetConfirm = useCallback(
    async (choice: TagliandoNoPresetChoice, reason: string) => {
      const row = pendingRow;
      setNoPresetDialogOpen(false);
      if (!row) return;
      if (choice === "cancel") {
        setPendingRow(null);
        return;
      }
      if (choice === "assign") {
        setPendingRow(null);
        return;
      }
      const result = await runTagliandoCompletion(row, reason);
      setPendingRow(null);
      if (result.ok) moveStato(row.id, STATO_LAVORAZIONE_COMPLETATA_ID);
    },
    [moveStato, pendingRow, runTagliandoCompletion],
  );

  return {
    moveStatoWithTagliando,
    noPresetDialogOpen,
    setNoPresetDialogOpen,
    handleNoPresetConfirm,
    lastCompletion,
    clearLastCompletion: () => setLastCompletion(null),
  };
}
