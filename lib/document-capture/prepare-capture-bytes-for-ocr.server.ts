import "server-only";

import { unzipSync } from "fflate";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isCaptureOfficeMime } from "@/lib/document-capture/mime-allowlist";
import { readSpreadsheetWorkbook, sheetToMatrix } from "@/lib/spreadsheet/xlsx-server";

function docxToPlainText(bytes: Uint8Array): string {
  const entries = unzipSync(bytes);
  const xmlBytes = entries["word/document.xml"];
  if (!xmlBytes) throw new Error("Documento Word non valido");
  const xml = new TextDecoder().decode(xmlBytes);
  return xml
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function plainTextToPdf(text: string, title?: string): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const body = text.trim() || "(documento vuoto)";
  if (title) {
    doc.setFontSize(12);
    doc.text(title, 10, 12);
    doc.setFontSize(10);
  }
  const lines = doc.splitTextToSize(body, 190);
  doc.text(lines, 10, title ? 20 : 12);
  return new Uint8Array(doc.output("arraybuffer"));
}

function spreadsheetToPdf(bytes: Uint8Array, fileName: string, mime: string): Uint8Array {
  const wb = readSpreadsheetWorkbook(bytes, fileName, mime);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Foglio Excel vuoto");
  const matrix = sheetToMatrix(wb.Sheets[sheetName]).map((row) => row.map((cell) => String(cell ?? "")));
  if (matrix.length === 0) throw new Error("Foglio Excel vuoto");
  const colCount = Math.max(...matrix.map((row) => row.length), 1);
  const doc = new jsPDF({
    orientation: colCount > 5 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  autoTable(doc, {
    body: matrix,
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak" },
    margin: { top: 10, left: 8, right: 8, bottom: 10 },
  });
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function prepareCaptureBytesForOcr(input: {
  bytes: Uint8Array;
  mime: string;
  fileName: string;
}): Promise<{ bytes: Uint8Array; mime: string }> {
  const mime = input.mime.trim().toLowerCase();
  if (!isCaptureOfficeMime(mime)) {
    return { bytes: input.bytes, mime };
  }

  if (mime === "application/msword") {
    throw new Error("I file Word .doc non sono supportati. Salva come .docx o PDF.");
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    mime === "text/csv"
  ) {
    return { bytes: spreadsheetToPdf(input.bytes, input.fileName, mime), mime: "application/pdf" };
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const text = docxToPlainText(input.bytes);
    const baseName = input.fileName.replace(/\.[^.]+$/, "") || "documento";
    return { bytes: plainTextToPdf(text, baseName), mime: "application/pdf" };
  }

  if (mime === "text/plain") {
    return { bytes: plainTextToPdf(new TextDecoder().decode(input.bytes)), mime: "application/pdf" };
  }

  throw new Error("Formato documento non convertibile per l'OCR");
}
