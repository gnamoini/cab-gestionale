import type { PreventivoTipoDocumento } from "@/lib/preventivi/types";

/** Bump per invalidare cache artifact PDF dopo cambi layout/sezioni. */
export const PREVENTIVO_PDF_LAYOUT_STAMP = "section-labels-v7";

/** SSOT — titoli sezione PDF preventivo/consuntivo per tipo documento. */
export function preventivoPdfLavorazioniSectionTitle(tipo: PreventivoTipoDocumento): string {
  return tipo === "consuntivo" ? "Lavorazioni effettuate" : "Lavorazioni da effettuare";
}

export function preventivoPdfMaterialiSectionTitle(tipo: PreventivoTipoDocumento): string {
  return tipo === "consuntivo" ? "Materiali utilizzati" : "Materiali da utilizzare";
}
