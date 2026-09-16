"use client";

import { useCallback, useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { HubIconClose } from "@/components/design-system/hub-table-action-icons";
import { dsPageToolbar, dsSystemBannerActions } from "@/lib/ui/design-system";
import type { PrintMezzoLabelsBulkPhase } from "@/lib/mezzo-labels/client/print-mezzo-labels-bulk-pdf";
import { printLavorazioniMezzoLabelsBulkPdf } from "@/lib/lavorazioni/client/print-lavorazioni-mezzo-labels-bulk-pdf";
import { resolveMezzoIdsFromWorkOrderSelection } from "@/lib/lavorazioni/lavorazioni-label-mezzo-ids";
import type { LavorazioniLabelSelection } from "@/lib/lavorazioni/client/lavorazioni-label-selection";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function LavorazioniBulkQrLabelToolbar({
  selection,
  rowById,
  onExitSelection,
}: {
  selection: LavorazioniLabelSelection;
  rowById: ReadonlyMap<string, LavorazioneListRow>;
  onExitSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [phase, setPhase] = useState<PrintMezzoLabelsBulkPhase>("idle");
  const busy = phase !== "idle";

  const orderedWorkOrderIds = useMemo(() => [...selection.selectedIds], [selection.selectedIds]);

  const resolved = useMemo(
    () => resolveMezzoIdsFromWorkOrderSelection(orderedWorkOrderIds, rowById),
    [orderedWorkOrderIds, rowById],
  );

  const canPrint = resolved.mezzoIds.length > 0 && !busy;

  const handlePrint = useCallback(async () => {
    if (!selection.hasSelection) return;

    const { mezzoIds, skippedWithoutMezzo } = resolveMezzoIdsFromWorkOrderSelection(
      orderedWorkOrderIds,
      rowById,
    );

    if (mezzoIds.length === 0) {
      gestToast.warning("Le lavorazioni selezionate non hanno mezzi validi da stampare.");
      return;
    }

    if (skippedWithoutMezzo > 0) {
      gestToast.info(
        `${skippedWithoutMezzo} lavorazion${skippedWithoutMezzo === 1 ? "e selezionata non ha" : "i selezionate non hanno"} un mezzo associato e non ${skippedWithoutMezzo === 1 ? "è stata inclusa" : "sono state incluse"} nelle etichette.`,
      );
    }

    try {
      const result = await printLavorazioniMezzoLabelsBulkPdf({
        workOrderIds: orderedWorkOrderIds,
        onPhaseChange: setPhase,
      });
      if (!result.ok) {
        if (result.reason === "open_failed") {
          gestToast.error("Impossibile aprire il PDF etichette.");
        }
        return;
      }
    } catch (e) {
      gestToast.error(e instanceof Error ? e.message : "Impossibile generare le etichette. Riprova.");
    }
  }, [gestToast, orderedWorkOrderIds, rowById, selection.hasSelection]);

  return (
    <div className={`${dsPageToolbar} mt-3 flex items-center justify-between gap-3 flex-nowrap sm:flex-wrap`}>
      <span className="text-sm font-medium text-[color:var(--cab-text)]">
        {selection.count} lavorazion{selection.count === 1 ? "e" : "i"} selezionat
        {selection.count === 1 ? "a" : "e"}
      </span>
      <div className={dsSystemBannerActions}>
        <LoadingButton
          type="button"
          variant="primary"
          size="sm"
          loading={busy}
          disabled={!canPrint}
          onClick={() => void handlePrint()}
        >
          Stampa etichette{resolved.mezzoIds.length > 0 ? ` (${resolved.mezzoIds.length})` : ""}
        </LoadingButton>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-[var(--ds-radius-md)] px-2 py-1 text-sm text-[color:var(--cab-text-muted)] hover:bg-[color:var(--cab-surface-muted)]"
          onClick={onExitSelection}
          disabled={busy}
        >
          <HubIconClose className="h-4 w-4" aria-hidden />
          Esci dalla selezione
        </button>
      </div>
    </div>
  );
}
