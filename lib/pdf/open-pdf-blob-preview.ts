"use client";

import { pushGestionaleToast } from "@/context/toast-context";
import {
  PDF_PREVIEW_API_PATH,
  PDF_PREVIEW_LEGACY_API_PATH,
} from "@/lib/pdf/pdf-preview-config";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

/** Nome file sicuro per download (spazi → underscore). */
export function normalizePdfDownloadFileName(fileName: string): string {
  const trimmed = fileName.trim() || "documento.pdf";
  const withExt = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  return withExt.replace(/\s+/g, "_");
}

function openPdfBlobViaObjectUrl(
  pdfFile: File,
  options?: { revokeBlobUrlAfterMs?: number; blockedMessage?: string },
): boolean {
  const url = URL.createObjectURL(pdfFile);
  const opened = openUrlInNewTab(url, {
    revokeBlobUrlAfterMs: options?.revokeBlobUrlAfterMs ?? 120_000,
    blockedMessage: options?.blockedMessage,
  });
  if (!opened) {
    pushGestionaleToast(
      options?.blockedMessage ??
        "Impossibile aprire l'anteprima PDF. Consenti i pop-up per questo sito.",
      "warning",
      5200,
    );
  }
  return opened;
}

function previewPostErrorMessage(status: number): string {
  if (status === 413) return "PDF troppo grande per l'anteprima server. Apertura locale.";
  if (status === 429) return "Troppe richieste PDF. Apertura locale.";
  if (status === 400) return "Anteprima PDF non valida. Apertura locale.";
  if (status === 403) return "Non autorizzato all'anteprima PDF. Apertura locale.";
  return "Anteprima PDF non disponibile. Apertura locale.";
}

/**
 * Anteprima PDF in nuova scheda con nome file corretto al download.
 * POST multipart → risposta PDF inline con Content-Disposition (multi-istanza safe).
 */
export async function openPdfBlobInNewTab(
  blob: Blob,
  fileName: string,
  options?: {
    revokeBlobUrlAfterMs?: number;
    blockedMessage?: string;
    /** Override endpoint (default {@link PDF_PREVIEW_API_PATH}). */
    previewAction?: string;
    /** Toast info durante generazione/POST (default true). */
    showLoadingFeedback?: boolean;
    /** Callback busy state (es. overlay globale). */
    onBusyChange?: (busy: boolean) => void;
  },
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const downloadName = normalizePdfDownloadFileName(fileName);
  const pdfFile =
    blob instanceof File && blob.type === "application/pdf"
      ? blob
      : new File([blob], downloadName, { type: "application/pdf" });

  const previewAction = options?.previewAction ?? PDF_PREVIEW_API_PATH;
  const showLoading = options?.showLoadingFeedback !== false;

  const setBusy = (busy: boolean) => {
    options?.onBusyChange?.(busy);
  };

  if (showLoading) {
    pushGestionaleToast("Apertura PDF in corso…", "info", 6000);
  }
  setBusy(true);

  try {
    const formData = new FormData();
    formData.append("fileName", downloadName);
    formData.append("pdf", pdfFile, downloadName);

    const res = await fetch(previewAction, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    if (res.ok && res.headers.get("content-type")?.includes("application/pdf")) {
      const responseBlob = await res.blob();
      const named = new File([responseBlob], downloadName, { type: "application/pdf" });
      return openPdfBlobViaObjectUrl(named, options);
    }

    pushGestionaleToast(previewPostErrorMessage(res.status), "warning", 5200);
  } catch {
    pushGestionaleToast("Anteprima PDF non disponibile. Apertura locale.", "warning", 5200);
  } finally {
    setBusy(false);
  }

  return openPdfBlobViaObjectUrl(pdfFile, options);
}

/** @deprecated Usare {@link PDF_PREVIEW_API_PATH}. */
export const PDF_PREVIEW_LEGACY_ACTION = PDF_PREVIEW_LEGACY_API_PATH;
