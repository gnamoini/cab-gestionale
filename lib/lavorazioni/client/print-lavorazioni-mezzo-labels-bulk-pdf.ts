"use client";

import {
  isDeferredPopupBlocked,
  openDeferredPopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
} from "@/lib/browser/popup-guard";
import { normalizePdfDownloadFileName, openFetchedPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import {
  MEZZO_LABELS_BULK_SYNC_GET_MAX_IDS,
  type PrintMezzoLabelsBulkPhase,
} from "@/lib/mezzo-labels/client/print-mezzo-labels-bulk-pdf";

export type PrintLavorazioniMezzoLabelsBulkPdfResult =
  | { ok: true; usedSyncGet: boolean }
  | { ok: false; reason: "empty" | "popup_blocked" | "open_failed" | "invalid_response" | "unknown" };

function buildLavorazioniMezzoBulkPdfUrl(workOrderIds: string[]): string {
  const params = new URLSearchParams({ format: "pdf" });
  for (const id of workOrderIds) params.append("id", id);
  return `/api/lavorazioni/mezzo-labels/bulk?${params.toString()}`;
}

const MAP_HTTP_ERROR = (status: number, serverMessage?: string) => {
  if (status === 403) return "Permesso negato.";
  return serverMessage ?? "Impossibile generare le etichette. Riprova.";
};

/** PDF etichette mezzo da lavorazioni — auth modulo Lavorazioni (non Mezzi). */
export async function printLavorazioniMezzoLabelsBulkPdf(options: {
  workOrderIds: string[];
  onPhaseChange?: (phase: PrintMezzoLabelsBulkPhase) => void;
}): Promise<PrintLavorazioniMezzoLabelsBulkPdfResult> {
  const workOrderIds = options.workOrderIds.filter(Boolean);
  if (workOrderIds.length === 0) return { ok: false, reason: "empty" };

  const setPhase = (p: PrintMezzoLabelsBulkPhase) => options.onPhaseChange?.(p);

  if (workOrderIds.length <= MEZZO_LABELS_BULK_SYNC_GET_MAX_IDS) {
    try {
      tryOpenViaTemporaryAnchor(buildLavorazioniMezzoBulkPdfUrl(workOrderIds));
      return { ok: true, usedSyncGet: true };
    } catch {
      return { ok: false, reason: "open_failed" };
    }
  }

  const deferredResult = openDeferredPopup({ context: "etichette", label: "PDF etichette mezzi" });
  if (isDeferredPopupBlocked(deferredResult)) return { ok: false, reason: "popup_blocked" };
  const deferred: DeferredPopupHandle = deferredResult;

  setPhase("generating");
  try {
    const res = await fetch("/api/lavorazioni/mezzo-labels/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workOrderIds, format: "pdf" }),
    });
    if (!res.ok) {
      deferred.close();
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(MAP_HTTP_ERROR(res.status, err.error));
    }
    const contentType = res.headers.get("Content-Type") ?? "";
    if (!contentType.includes("application/pdf")) {
      deferred.close();
      return { ok: false, reason: "invalid_response" };
    }
    setPhase("opening");
    const blob = await res.blob();
    const opened = openFetchedPdfBlobInNewTab(
      blob,
      normalizePdfDownloadFileName(`etichette-mezzi-lavorazioni.pdf`),
      {
        context: "etichette",
        label: "PDF etichette mezzi",
        deferredHandle: deferred,
      },
    );
    if (!opened) {
      deferred.close();
      return { ok: false, reason: "open_failed" };
    }
    return { ok: true, usedSyncGet: false };
  } catch (e) {
    deferred.close();
    if (e instanceof Error) throw e;
    return { ok: false, reason: "unknown" };
  } finally {
    setPhase("idle");
  }
}
