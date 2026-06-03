"use client";

import { buildDipendentiPdfDownloadFileName } from "@/lib/dipendenti/dipendenti-pdf-filename";
import {
  buildDipendentiPdfContext,
  employeeDisplayName,
  type DipendentiPdfContext,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import { buildComplessivoPdf, buildDipendentePdf } from "@/lib/dipendenti/pdf/dipendenti-pdf-sections";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";

export { buildDipendentiPdfContext };
export type { DipendentiPdfContext };

export function openDipendentiPdfComplessivoInNewTab(ctx: DipendentiPdfContext): void {
  if (ctx.employees.length === 0) return;
  const doc = buildComplessivoPdf(ctx);
  void openPdfBlobInNewTab(
    doc.output("blob"),
    buildDipendentiPdfDownloadFileName({ monthKey: ctx.monthKey, kind: "aziendale" }),
  );
}

export function openDipendentiPdfDipendenteInNewTab(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
): void {
  const doc = buildDipendentePdf(ctx, employee);
  const displayName = employeeDisplayName(employee, ctx.entries);
  void openPdfBlobInNewTab(
    doc.output("blob"),
    buildDipendentiPdfDownloadFileName({
      monthKey: ctx.monthKey,
      kind: "dipendente",
      employeeName: displayName,
    }),
  );
}
