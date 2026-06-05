"use client";

/** Carica moduli PDF on-demand per non includere jspdf nel chunk route iniziale. */
export async function importLavorazioniListPdf() {
  return import("@/lib/lavorazioni/lavorazioni-list-pdf");
}

export async function importPreventiviPdf() {
  return import("@/lib/preventivi/preventivi-pdf");
}

export async function importBunderPdf() {
  return import("@/lib/bunder/bunder-pdf");
}

export async function importDipendentiPdfSections() {
  return import("@/lib/dipendenti/pdf/dipendenti-pdf-sections");
}
