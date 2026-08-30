"use client";

import type { DeferredPopupHandle } from "@/lib/browser/popup-guard";
import { openPdfArtifact, openPdfArtifactFromUserClick } from "@/lib/pdf/client/pdf-viewer";

/** PDF DDT ufficiale — nuova scheda (SSOT artifact API). */
export async function openDdtPdfInNewTab(
  ddtId: string,
  deferredHandle?: DeferredPopupHandle | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (deferredHandle) {
    await openPdfArtifact("ddt", { id: ddtId }, deferredHandle);
    return;
  }
  openPdfArtifactFromUserClick("ddt", { id: ddtId });
}
