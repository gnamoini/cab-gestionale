"use client";

import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

const PREVIEW_ACTION = "/api/preventivi/pdf-anteprima";

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
    window.alert(
      options?.blockedMessage ??
        "Impossibile aprire l'anteprima PDF. Consenti i pop-up per questo sito.",
    );
  }
  return opened;
}

/**
 * Anteprima PDF in nuova scheda con nome file corretto al download.
 * POST multipart → token → GET con Content-Disposition.
 */
export async function openPdfBlobInNewTab(
  blob: Blob,
  fileName: string,
  options?: {
    revokeBlobUrlAfterMs?: number;
    blockedMessage?: string;
    previewAction?: string;
  },
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const downloadName = normalizePdfDownloadFileName(fileName);
  const pdfFile =
    blob instanceof File && blob.type === "application/pdf"
      ? blob
      : new File([blob], downloadName, { type: "application/pdf" });

  const previewAction = options?.previewAction ?? PREVIEW_ACTION;

  try {
    const formData = new FormData();
    formData.append("fileName", downloadName);
    formData.append("pdf", pdfFile, downloadName);

    const res = await fetch(previewAction, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    if (res.ok) {
      const payload = (await res.json()) as { previewUrl?: string; error?: string };
      const previewUrl = payload.previewUrl?.trim();
      if (previewUrl) {
        const absolute = new URL(previewUrl, window.location.origin).href;
        return openUrlInNewTab(absolute, {
          blockedMessage: options?.blockedMessage,
        });
      }
    }
  } catch {
    /* fallback locale */
  }

  return openPdfBlobViaObjectUrl(pdfFile, options);
}
