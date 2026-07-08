"use client";

import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { pushGestionaleToast } from "@/context/toast-context";

/** PDF da DB (lista, ordine già salvato). */
export async function openOrdineFornitorePdfInNewTab(o: Pick<OrdineFornitoreRecord, "id">): Promise<void> {
  await openPdfArtifact("ordine-fornitore", { id: o.id });
}

/** Anteprima WYSIWYG dall'editor — non richiede salvataggio su DB. */
export async function openOrdineFornitorePdfPreviewFromRecord(record: OrdineFornitoreRecord): Promise<void> {
  pushGestionaleToast("Generazione PDF in corso…", "info", 5000);
  try {
    const [{ generateOrdineFornitorePdfBytes, ordineFornitorePdfFileName }, logo] = await Promise.all([
      import("@/lib/ordini-fornitori/ordine-fornitore-pdf-generate"),
      loadBrandingLogoDataUrl(),
    ]);
    const bytes = generateOrdineFornitorePdfBytes(record, logo);
    const fileName = ordineFornitorePdfFileName(record);
    const blobUrl = URL.createObjectURL(
      new File([bytes], fileName, { type: "application/pdf" }),
    );
    const opened = openUrlInNewTab(blobUrl, {
      revokeBlobUrlAfterMs: 120_000,
      blockedMessage: "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
    });
    if (!opened) {
      pushGestionaleToast(
        "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
        "warning",
        5200,
      );
    }
  } catch {
    pushGestionaleToast("Generazione PDF non riuscita.", "warning", 5200);
  }
}
