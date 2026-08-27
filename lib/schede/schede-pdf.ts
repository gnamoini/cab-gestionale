"use client";

import { openPdfArtifactFromUserClick } from "@/lib/pdf/request-pdf-artifact";
import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";

function schedaArtifactType(
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc,
): "scheda-ingresso" | "scheda-lavorazioni" | "scheda-ricambi" {
  if (doc.tipo === "ingresso") return "scheda-ingresso";
  if (doc.tipo === "lavorazioni") return "scheda-lavorazioni";
  return "scheda-ricambi";
}

/** Apre PDF scheda via artifact API — sync sul click (come etichetta QR). */
export function openSchedaPdfInNewTab(opts: {
  titoloScheda: string;
  identificazioneLine: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
}): void {
  openPdfArtifactFromUserClick(
    schedaArtifactType(opts.doc),
    { lavorazioneId: opts.bundle.lavorazioneId, autore: opts.autore },
    { context: "scheda" },
  );
}
