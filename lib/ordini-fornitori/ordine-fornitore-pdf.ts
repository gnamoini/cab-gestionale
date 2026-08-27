"use client";

import { generateOrdineFornitorePdfBytes, ordineFornitorePdfFileName } from "@/lib/ordini-fornitori/ordine-fornitore-pdf-generate";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { pushGestionaleToast } from "@/context/toast-context";

/** PDF da DB (lista, ordine già salvato). */
export async function openOrdineFornitorePdfInNewTab(
  o: Pick<OrdineFornitoreRecord, "id">,
  deferredHandle?: DeferredPopupHandle | null,
): Promise<void> {
  await openPdfArtifact("ordine-fornitore", { id: o.id }, deferredHandle);
}

/** Anteprima WYSIWYG dall'editor — sync form POST dopo generazione bytes. */
export function openOrdineFornitorePdfPreviewFromRecord(
  record: OrdineFornitoreRecord,
  logoDataUrl?: string | null,
): boolean {
  const bytes = generateOrdineFornitorePdfBytes(record, logoDataUrl ?? null);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const opened = openPdfBlobInNewTab(blob, ordineFornitorePdfFileName(record), {
    context: "pdf",
    label: "PDF ordine fornitore",
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
}

export async function openOrdineFornitorePdfPreviewFromRecordAsync(
  record: OrdineFornitoreRecord,
): Promise<boolean> {
  const logo = await loadBrandingLogoDataUrl();
  return openOrdineFornitorePdfPreviewFromRecord(record, logo);
}
