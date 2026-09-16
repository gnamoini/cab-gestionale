"use client";

import {
  isDeferredPopupBlocked,
  openDeferredPopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
} from "@/lib/browser/popup-guard";
import { normalizePdfDownloadFileName, openFetchedPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";

export type PrintMezzoLabelsBulkPhase = "idle" | "generating" | "opening";

/** ponytail: GET sync open ceiling — URL ~2k; oltre usa POST + deferred. */
export const MEZZO_LABELS_BULK_SYNC_GET_MAX_IDS = 50;

export function buildMezzoBulkPdfUrl(mezzoIds: string[]): string {
  const params = new URLSearchParams({ format: "pdf" });
  for (const id of mezzoIds) params.append("id", id);
  return `/api/mezzo-labels/bulk?${params.toString()}`;
}

export type PrintMezzoLabelsBulkPdfResult =
  | { ok: true; usedSyncGet: boolean }
  | { ok: false; reason: "empty" | "popup_blocked" | "open_failed" | "http_error" | "invalid_response" | "unknown" };

export type PrintMezzoLabelsBulkPdfOptions = {
  mezzoIds: string[];
  onPhaseChange?: (phase: PrintMezzoLabelsBulkPhase) => void;
  /** Messaggio utente per errori HTTP (es. 403). */
  mapHttpError?: (status: number, serverMessage?: string) => string;
};

const DEFAULT_MAP_HTTP_ERROR = (status: number, serverMessage?: string) => {
  if (status === 403) return "Non hai permesso di stampare etichette mezzo.";
  return serverMessage ?? "Impossibile generare le etichette. Riprova.";
};

/**
 * Apre il PDF bulk etichette mezzo — stesso comportamento della pagina Mezzi.
 */
export async function printMezzoLabelsBulkPdf(
  options: PrintMezzoLabelsBulkPdfOptions,
): Promise<PrintMezzoLabelsBulkPdfResult> {
  const mezzoIds = options.mezzoIds.filter(Boolean);
  if (mezzoIds.length === 0) return { ok: false, reason: "empty" };

  const mapHttpError = options.mapHttpError ?? DEFAULT_MAP_HTTP_ERROR;
  const setPhase = (p: PrintMezzoLabelsBulkPhase) => options.onPhaseChange?.(p);

  if (mezzoIds.length <= MEZZO_LABELS_BULK_SYNC_GET_MAX_IDS) {
    try {
      tryOpenViaTemporaryAnchor(buildMezzoBulkPdfUrl(mezzoIds));
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
    const res = await fetch("/api/mezzo-labels/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mezzoIds, format: "pdf" }),
    });
    if (!res.ok) {
      deferred.close();
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(mapHttpError(res.status, err.error));
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
      normalizePdfDownloadFileName(`etichette-mezzi-${mezzoIds.length}.pdf`),
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
