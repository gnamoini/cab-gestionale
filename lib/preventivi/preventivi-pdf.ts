"use client";

import { generatePreventivoPdfBytes, preventivoPdfFileName } from "@/lib/preventivi/preventivo-pdf-generate";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Anteprima WYSIWYG dall'editor — sync submit dopo generazione bytes. */
export function openPreventivoPdfPreviewFromRecord(
  p: PreventivoRecord,
  autore: string,
  logoDataUrl?: string | null,
): boolean {
  const operatore = p.lastEditedBy?.trim() || autore.trim() || "Operatore";
  const bytes = generatePreventivoPdfBytes(p, operatore, logoDataUrl ?? null);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  return openPdfBlobInNewTab(blob, preventivoPdfFileName(p), {
    context: "pdf",
    label: "PDF preventivo",
    showLoadingFeedback: false,
  });
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
  await openPdfArtifact("preventivo", { id: p.id, autore }, deferredHandle);
}
