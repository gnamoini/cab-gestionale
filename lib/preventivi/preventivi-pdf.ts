"use client";

import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Anteprima WYSIWYG dall'editor — non richiede salvataggio su DB. */
export async function openPreventivoPdfPreviewFromRecord(
  p: PreventivoRecord,
  autore: string,
): Promise<void> {
  const [{ generatePreventivoPdfBytes, preventivoPdfFileName }, logo] = await Promise.all([
    import("@/lib/preventivi/preventivo-pdf-generate"),
    loadBrandingLogoDataUrl(),
  ]);
  const operatore = p.lastEditedBy?.trim() || autore.trim() || "Operatore";
  const bytes = generatePreventivoPdfBytes(p, operatore, logo);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  await openPdfBlobInNewTab(blob, preventivoPdfFileName(p));
}

/** PDF da DB (lista, hub lavorazioni/mezzi — record già salvato). */
export async function openPreventivoPdfInNewTab(p: PreventivoRecord, autore: string): Promise<void> {
  await openPdfArtifact("preventivo", { id: p.id, autore });
}
