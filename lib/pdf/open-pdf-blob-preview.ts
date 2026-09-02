"use client";

import { pushGestionaleToast } from "@/context/toast-context";
import {
  type PopupGuardContext,
} from "@/lib/browser/popup-guard";
import {
  PDF_PREVIEW_API_PATH,
  PDF_PREVIEW_LEGACY_API_PATH,
} from "@/lib/pdf/pdf-preview-config";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";

/** Nome file sicuro per download (spazi → underscore). */
export function normalizePdfDownloadFileName(fileName: string): string {
  const trimmed = fileName.trim() || "documento.pdf";
  const withExt = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  return withExt.replace(/\s+/g, "_");
}

/**
 * POST multipart → nuova scheda con PDF inline (nessun about:blank, nessun fetch client).
 * Richiede user gesture sul submit sincrono.
 */
export function submitPdfPreviewInNewTab(
  pdfFile: File,
  previewAction = PDF_PREVIEW_API_PATH,
): boolean {
  if (typeof document === "undefined") return false;
  try {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = previewAction;
    form.target = "_blank";
    form.enctype = "multipart/form-data";
    form.style.display = "none";

    const fileNameInput = document.createElement("input");
    fileNameInput.type = "hidden";
    fileNameInput.name = "fileName";
    fileNameInput.value = normalizePdfDownloadFileName(pdfFile.name);
    form.appendChild(fileNameInput);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "pdf";
    fileInput.multiple = false;
    const dt = new DataTransfer();
    dt.items.add(pdfFile);
    fileInput.files = dt.files;
    form.appendChild(fileInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    return true;
  } catch {
    return false;
  }
}

/**
 * PDF già in memoria — apre blob in nuova scheda (nessun round-trip server).
 */
export function openPdfBlobInNewTab(
  blob: Blob,
  fileName: string,
  options?: {
    previewAction?: string;
    showLoadingFeedback?: boolean;
    context?: PopupGuardContext;
    label?: string;
  },
): boolean {
  if (typeof window === "undefined") return false;

  const downloadName = normalizePdfDownloadFileName(fileName);
  const pdfFile =
    blob instanceof File && blob.type === "application/pdf"
      ? blob
      : new File([blob], downloadName, { type: "application/pdf" });

  if (options?.showLoadingFeedback !== false) {
    pushGestionaleToast("Apertura PDF in corso…", "info", 4000);
  }

  const context = options?.context ?? "pdf";
  const blobUrl = URL.createObjectURL(pdfFile);
  const openedLocal = openUrlInNewTab(blobUrl, {
    context,
    label: options?.label,
    revokeBlobUrlAfterMs: 120_000,
  });
  if (openedLocal) return true;
  URL.revokeObjectURL(blobUrl);

  pushGestionaleToast(
    "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
    "warning",
    5200,
  );
  return false;
}

/** PDF da fetch — tab pre-aperta (deferred) o form POST sync. */
export function openFetchedPdfBlobInNewTab(
  blob: Blob,
  fileName: string,
  options?: {
    deferredHandle?: DeferredPopupHandle | null;
    context?: PopupGuardContext;
    label?: string;
    revokeBlobUrlAfterMs?: number;
  },
): boolean {
  const downloadName = normalizePdfDownloadFileName(fileName);
  const pdfFile =
    blob instanceof File && blob.type === "application/pdf"
      ? blob
      : new File([blob], downloadName, { type: "application/pdf" });
  const context = options?.context ?? "pdf";

  if (options?.deferredHandle?.isAlive()) {
    const url = URL.createObjectURL(pdfFile);
    const opened = openUrlInNewTab(url, {
      deferredHandle: options.deferredHandle,
      context,
      label: options?.label,
      revokeBlobUrlAfterMs: options?.revokeBlobUrlAfterMs ?? 120_000,
      downloadFileName: downloadName,
    });
    if (!opened) {
      URL.revokeObjectURL(url);
      options.deferredHandle.close();
      return openPdfBlobInNewTab(blob, fileName, { context, label: options?.label, showLoadingFeedback: false });
    }
    return true;
  }

  return openPdfBlobInNewTab(blob, fileName, {
    context,
    label: options?.label,
    showLoadingFeedback: false,
  });
}

/** @deprecated Usare {@link PDF_PREVIEW_API_PATH}. */
export const PDF_PREVIEW_LEGACY_ACTION = PDF_PREVIEW_LEGACY_API_PATH;
