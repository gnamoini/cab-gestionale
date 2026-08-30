"use client";

import { useCallback, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { HubIconClose } from "@/components/design-system/hub-table-action-icons";
import { dsPageToolbar, dsSystemBannerActions } from "@/lib/ui/design-system";
import {
  isDeferredPopupBlocked,
  openDeferredPopup,
  tryOpenViaTemporaryAnchor,
} from "@/lib/browser/popup-guard";
import { normalizePdfDownloadFileName, openFetchedPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import type { MezziQrSelection } from "@/lib/mezzi/client/mezzi-qr-selection";

type BulkPhase = "idle" | "generating" | "opening";

/** ponytail: GET sync open ceiling — URL ~2k; oltre usa POST + deferred. */
const BULK_SYNC_GET_MAX_IDS = 50;

function buildMezzoBulkPdfUrl(mezzoIds: string[]): string {
  const params = new URLSearchParams({ format: "pdf" });
  for (const id of mezzoIds) params.append("id", id);
  return `/api/mezzo-labels/bulk?${params.toString()}`;
}

export function MezziBulkQrLabelToolbar({
  selection,
  onClearSelection,
}: {
  selection: MezziQrSelection;
  onClearSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [phase, setPhase] = useState<BulkPhase>("idle");
  const { count, hasSelection } = selection;
  const busy = phase !== "idle";

  const handlePrint = useCallback(async () => {
    if (!hasSelection) return;
    const mezzoIds = [...selection.selectedIds];

    if (mezzoIds.length <= BULK_SYNC_GET_MAX_IDS) {
      try {
        // ponytail: un solo tab — API inline via anchor (come etichetta singola)
        tryOpenViaTemporaryAnchor(buildMezzoBulkPdfUrl(mezzoIds));
        return;
      } catch {
        gestToast.error("Impossibile aprire il PDF etichette.");
        return;
      }
    }

    const deferredResult = openDeferredPopup({ context: "etichette", label: "PDF etichette mezzi" });
    if (isDeferredPopupBlocked(deferredResult)) return;
    const deferred = deferredResult;

    setPhase("generating");
    try {
      const res = await fetch("/api/mezzo-labels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mezzoIds, format: "pdf" }),
      });
      if (!res.ok) {
        deferred.close();
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Generazione bulk fallita");
      }
      const contentType = res.headers.get("Content-Type") ?? "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("Risposta non valida: atteso PDF etichette.");
      }
      setPhase("opening");
      const blob = await res.blob();
      const opened = openFetchedPdfBlobInNewTab(
        blob,
        normalizePdfDownloadFileName(`etichette-mezzi-${mezzoIds.length}.pdf`),
        {
          context: "etichette",
          label: "PDF etichette mezzi",
          deferredHandle: deferred,
        },
      );
      if (!opened) {
        deferred.close();
        gestToast.error("Impossibile aprire il PDF etichette.");
      }
    } catch (e) {
      deferred.close();
      gestToast.error(e instanceof Error ? e.message : "Stampa etichette non riuscita.");
    } finally {
      setPhase("idle");
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
