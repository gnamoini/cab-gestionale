"use client";

/**
 * SSOT client PDF viewer — anchor sync, deferred popup, blob preview.
 */
export {
  buildPdfArtifactUrl,
  openPdfArtifact,
  openPdfArtifactFromUserClick,
  openPdfStreamFromUserClick,
  openPdfStreamInNewTab,
  type OpenPdfArtifactParams,
} from "@/lib/pdf/request-pdf-artifact";

export {
  normalizePdfDownloadFileName,
  openFetchedPdfBlobInNewTab,
  openPdfBlobInNewTab,
  submitPdfPreviewInNewTab,
} from "@/lib/pdf/open-pdf-blob-preview";

export { openUrlInNewTab, openBlankWindowForDocumentWrite } from "@/lib/pdf/open-url-new-tab";

import { tryOpenViaTemporaryAnchor } from "@/lib/browser/popup-guard";

/** Apre URL PDF same-origin con anchor sync (preferito per API inline). */
export function openPdfApiUrlFromUserClick(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("/api/")) return false;
  try {
    tryOpenViaTemporaryAnchor(trimmed);
    return true;
  } catch {
    return false;
  }
}
