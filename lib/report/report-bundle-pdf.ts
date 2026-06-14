import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
  drawGestionaleDataSectionTable,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";
import type { ReportPdfDataSnapshot } from "@/lib/report/report-pdf-data.server";

export function buildReportBundlePdfFileName(): string {
  const d = new Date();
  return `report_gestionale_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.pdf`;
}

export function generateReportBundlePdfBytes(
  snapshot: ReportPdfDataSnapshot,
  logoDataUrl: string | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);

  let y = drawGestionalePdfHeader(doc, pageW, "REPORT GESTIONALE", {
    data: fmtDateIt(snapshot.generatedAt),
    metaDivider: false,
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  const body = [
    ["Lavorazioni attive", String(snapshot.lavorazioniCount)],
    ["Lavorazioni archivio", String(snapshot.lavorazioniArchivioCount)],
    ["Ricambi magazzino", String(snapshot.magazzinoCount)],
    ["Giacenza totale (pz)", String(snapshot.magazzinoGiacenzaTotale)],
    ["Mezzi anagrafica", String(snapshot.mezziCount)],
    ["Movimenti ricambi", String(snapshot.movimentiCount)],
  ];

  drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "SINTESI KPI",
    ["Indicatore", "Valore"],
    body,
    {
      0: { cellWidth: contentW * 0.62, halign: "left" as const },
      1: { cellWidth: contentW * 0.38, halign: "right" as const },
    },
  );

  drawPdfPageFooters(doc, "Report gestionale");
  return new Uint8Array(doc.output("arraybuffer"));
}
