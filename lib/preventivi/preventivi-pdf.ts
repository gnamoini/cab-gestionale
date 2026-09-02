"use client";

import { generatePreventivoPdfBytes, preventivoPdfFileName } from "@/lib/preventivi/preventivo-pdf-generate";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";
import { pushGestionaleToast } from "@/context/toast-context";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { openPdfArtifact, openPdfArtifactFromUserClick } from "@/lib/pdf/client/pdf-viewer";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Anteprima WYSIWYG dall'editor — sync submit dopo generazione bytes. */
export function openPreventivoPdfPreviewFromRecord(
  p: PreventivoRecord,
  autore: string,
  logoDataUrl?: string | null,
): boolean {
  try {
    const operatore = p.lastEditedBy?.trim() || autore.trim() || "Operatore";
    const bytes = generatePreventivoPdfBytes(p, operatore, logoDataUrl ?? null);
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const opened = openPdfBlobInNewTab(blob, preventivoPdfFileName(p), {
      context: "pdf",
      label: "PDF preventivo",
      showLoadingFeedback: false,
    });
    if (!opened) {
      pushGestionaleToast(
        "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
        "warning",
        5200,
      );
    }
    return opened;
  } catch {
    pushGestionaleToast("Generazione anteprima PDF non riuscita.", "warning", 5200);
    return false;
  }
}

/** Anteprima async (carica logo) — usa solo se il click può attendere prima del submit. */
export async function openPreventivoPdfPreviewFromRecordAsync(
  p: PreventivoRecord,
  autore: string,
): Promise<boolean> {
  const logo = await loadBrandingLogoDataUrl();
  return openPreventivoPdfPreviewFromRecord(p, autore, logo);
}

/** Pagina anteprima ufficiale embedded (link diretto / portale). */
export function preventivoOfficialPreviewPath(preventivoId: string): string {
  return `/documenti/preventivo/${encodeURIComponent(preventivoId)}/preview`;
}

/** PDF preventivo salvato — nuova scheda (SSOT artifact API). */
export async function openPreventivoPdfInNewTab(
  p: PreventivoRecord,
  autore: string,
  deferredHandle?: DeferredPopupHandle | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (deferredHandle) {
    await openPdfArtifact("preventivo", { id: p.id, autore }, deferredHandle);
    return;
  }
  openPdfArtifactFromUserClick("preventivo", { id: p.id, autore });
}
