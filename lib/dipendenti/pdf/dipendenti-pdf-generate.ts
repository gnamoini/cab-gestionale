import type { jsPDF as JsPDFDoc } from "jspdf";
import { buildDipendentiPdfDownloadFileName } from "@/lib/dipendenti/dipendenti-pdf-filename";
import {
  buildComplessivoPdf,
  buildDipendentePdf,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-sections";
import {
  pdfEmployeeDisplayName,
  type DipendentiPdfContext,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

function docToBytes(doc: JsPDFDoc): Uint8Array {
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function generateDipendentiComplessivoPdfBytes(
  ctx: DipendentiPdfContext,
  logoDataUrl: string | null,
): Promise<Uint8Array> {
  const doc = await buildComplessivoPdf(ctx, logoDataUrl);
  return docToBytes(doc);
}

export async function generateDipendentiDipendentePdfBytes(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
  logoDataUrl: string | null,
): Promise<Uint8Array> {
  const doc = await buildDipendentePdf(ctx, employee, logoDataUrl);
  return docToBytes(doc);
}

export function dipendentiComplessivoFileName(ctx: DipendentiPdfContext): string {
  return buildDipendentiPdfDownloadFileName({ monthKey: ctx.monthKey, kind: "aziendale" });
}

export function dipendentiDipendenteFileName(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
): string {
  return buildDipendentiPdfDownloadFileName({
    monthKey: ctx.monthKey,
    kind: "dipendente",
    employeeName: pdfEmployeeDisplayName(ctx, employee),
  });
}
