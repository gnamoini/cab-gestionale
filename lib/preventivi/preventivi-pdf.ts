"use client";

import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export async function openPreventivoPdfInNewTab(p: PreventivoRecord, autore: string): Promise<void> {
  await openPdfArtifact("preventivo", { id: p.id, autore });
}
