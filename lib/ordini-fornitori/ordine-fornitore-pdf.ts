"use client";

import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

export async function openOrdineFornitorePdfInNewTab(o: Pick<OrdineFornitoreRecord, "id">): Promise<void> {
  await openPdfArtifact("ordine-fornitore", { id: o.id });
}
