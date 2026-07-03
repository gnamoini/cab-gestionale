import type { jsPDF } from "jspdf";
import { pdfImageFormatFromDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";

const PDF_SIDE_MARGIN_MM = 14;

/** Blocco firma richiedente sotto sezione Cliente nel PDF ingresso. */
export function drawRichiedenteFirmaPdfBlock(
  doc: jsPDF,
  pageW: number,
  y: number,
  dataUrl?: string | null,
): number {
  const src = dataUrl?.trim() ?? "";
  if (!hasSignatureDataUrl(src)) return y;

  try {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Firma richiedente", PDF_SIDE_MARGIN_MM, y + 4);

    const contentW = pageW - PDF_SIDE_MARGIN_MM * 2;
    const imgW = Math.min(72, contentW);
    const imgH = 24;
    const imgY = y + 7;
    doc.addImage(src, pdfImageFormatFromDataUrl(src), PDF_SIDE_MARGIN_MM, imgY, imgW, imgH, undefined, "FAST");
    return imgY + imgH + 6;
  } catch {
    return y;
  }
}
