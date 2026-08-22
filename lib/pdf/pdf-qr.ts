import QRCode from "qrcode";
import type { jsPDF } from "jspdf";
import { PDF_MARGIN_R, PDF_MARGIN_TOP } from "@/lib/pdf/preventivo-pdf-layout";

const PDF_QR_SIZE_MM = 20;

export async function generatePdfQrDataUrl(url: string): Promise<string | null> {
  const target = url.trim();
  if (!target) return null;
  try {
    return await QRCode.toDataURL(target, { margin: 1, width: 256, errorCorrectionLevel: "M" });
  } catch {
    return null;
  }
}

/** QR in alto a destra — non sposta il layout centrale dell'header. */
export function drawPdfQrTopRight(doc: jsPDF, pageW: number, qrDataUrl: string, caption?: string): void {
  const size = PDF_QR_SIZE_MM;
  const x = pageW - PDF_MARGIN_R - size;
  const y = PDF_MARGIN_TOP;
  try {
    doc.addImage(qrDataUrl, "PNG", x, y, size, size, undefined, "FAST");
  } catch {
    return;
  }
  if (!caption?.trim()) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(caption.trim(), x + size / 2, y + size + 3, { align: "center", maxWidth: size + 8 });
}
