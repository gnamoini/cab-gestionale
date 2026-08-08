"use client";

import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { pushGestionaleToast } from "@/context/toast-context";

/** PDF da DB (lista, ordine già salvato). */
export async function openOrdineFornitorePdfInNewTab(o: Pick<OrdineFornitoreRecord, "id">): Promise<void> {
  await openPdfArtifact("ordine-fornitore", { id: o.id });
}

/** Anteprima WYSIWYG dall'editor — non richiede salvataggio su DB. */
export async function openOrdineFornitorePdfPreviewFromRecord(
  record: OrdineFornitoreRecord,
  deferredHandle?: DeferredPopupHandle | null,
): Promise<void> {
  pushGestionaleToast("Generazione PDF in corso…", "info", 5000);
  try {
    const [{ generateOrdineFornitorePdfBytes, ordineFornitorePdfFileName }, logo] = await Promise.all([
      import("@/lib/ordini-fornitori/ordine-fornitore-pdf-generate"),
      loadBrandingLogoDataUrl(),
    ]);
    const bytes = generateOrdineFornitorePdfBytes(record, logo);
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const opened = await openPdfBlobInNewTab(blob, ordineFornitorePdfFileName(record), {
      deferredHandle,
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
  } catch {
    deferredHandle?.close();
    pushGestionaleToast("Generazione PDF non riuscita.", "warning", 5200);
  }
}
