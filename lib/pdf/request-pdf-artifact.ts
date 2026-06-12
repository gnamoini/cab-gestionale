"use client";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { pushGestionaleToast } from "@/context/toast-context";

export type OpenPdfArtifactParams = {
  id?: string;
  lavorazioneId?: string;
  month?: string;
  employeeId?: string;
  autore?: string;
};

export function buildPdfArtifactUrl(type: PdfArtifactType, params?: OpenPdfArtifactParams): string {
  const search = new URLSearchParams();
  if (params?.id) search.set("id", params.id);
  if (params?.lavorazioneId) search.set("lavorazioneId", params.lavorazioneId);
  if (params?.month) search.set("month", params.month);
  if (params?.employeeId) search.set("employeeId", params.employeeId);
  if (params?.autore) search.set("autore", params.autore);
  const qs = search.toString();
  return qs ? `/api/pdf/artifacts/${type}?${qs}` : `/api/pdf/artifacts/${type}`;
}

/** Apre un PDF artifact server-side (GET RBAC + cache storage) in nuova scheda. */
export function openPdfArtifact(type: PdfArtifactType, params?: OpenPdfArtifactParams): boolean {
  const url = buildPdfArtifactUrl(type, params);
  const opened = openUrlInNewTab(url, {
    blockedMessage: "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
  });
  if (!opened) {
    pushGestionaleToast(
      "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
      "warning",
    );
  }
  return opened;
}
