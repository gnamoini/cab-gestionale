"use client";

import type { BunderCommercialDocument } from "@/lib/bunder/types";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";

export async function openBunderPdfInNewTab(doc: BunderCommercialDocument, autore: string): Promise<boolean> {
  return openPdfArtifact("bunder", { id: doc.id, autore });
}
