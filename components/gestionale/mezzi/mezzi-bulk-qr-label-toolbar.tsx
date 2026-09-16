"use client";

import { useCallback, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { HubIconClose } from "@/components/design-system/hub-table-action-icons";
import { dsPageToolbar, dsSystemBannerActions } from "@/lib/ui/design-system";
import {
  printMezzoLabelsBulkPdf,
  type PrintMezzoLabelsBulkPhase,
} from "@/lib/mezzo-labels/client/print-mezzo-labels-bulk-pdf";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import type { MezziQrSelection } from "@/lib/mezzi/client/mezzi-qr-selection";

export function MezziBulkQrLabelToolbar({
  selection,
  onClearSelection,
}: {
  selection: MezziQrSelection;
  onClearSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [phase, setPhase] = useState<PrintMezzoLabelsBulkPhase>("idle");
  const { count, hasSelection } = selection;
  const busy = phase !== "idle";

  const handlePrint = useCallback(async () => {
    if (!hasSelection) return;
    const mezzoIds = [...selection.selectedIds];

    try {
      const result = await printMezzoLabelsBulkPdf({
        mezzoIds,
        onPhaseChange: setPhase,
      });
      if (!result.ok) {
        if (result.reason === "open_failed") {
          gestToast.error("Impossibile aprire il PDF etichette.");
        }
        return;
      }
    } catch (e) {
      gestToast.error(e instanceof Error ? e.message : "Stampa etichette non riuscita.");
    }
  }, [gestToast, hasSelection, selection.selectedIds]);

  if (!hasSelection) return null;

  return (
    <div className={`${dsPageToolbar} mt-3 flex items-center justify-between gap-3 flex-nowrap sm:flex-wrap`}>
      <span className="text-sm font-medium text-[color:var(--cab-text)]">
        {count} mezz{count === 1 ? "o" : "i"} selezionat{count === 1 ? "o" : "i"}
      </span>
      <div className={dsSystemBannerActions}>
        <LoadingButton
          type="button"
          variant="primary"
          size="sm"
          loading={busy}
          onClick={() => void handlePrint()}
        >
          Stampa etichette QR
        </LoadingButton>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-[var(--ds-radius-md)] px-2 py-1 text-sm text-[color:var(--cab-text-muted)] hover:bg-[color:var(--cab-surface-muted)]"
          onClick={onClearSelection}
          disabled={busy}
        >
          <HubIconClose className="h-4 w-4" aria-hidden />
          Deseleziona
        </button>
      </div>
    </div>
  );
}
