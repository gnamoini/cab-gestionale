"use client";

import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";

/** PDF DDT ufficiale — nuova scheda (SSOT artifact API). */
export async function openDdtPdfInNewTab(ddtId: string): Promise<void> {
  if (typeof window === "undefined") return;
  await openPdfArtifact("ddt", { id: ddtId });
}
