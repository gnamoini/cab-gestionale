"use client";

import { buildDipendentiPdfDownloadFileName } from "@/lib/dipendenti/dipendenti-pdf-filename";
import {
  buildDipendentiPdfContext,
  employeeDisplayName,
  type DipendentiPdfContext,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import { importDipendentiPdfSections } from "@/lib/pdf/lazy-pdf-modules";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";

export { buildDipendentiPdfContext };
export type { DipendentiPdfContext };

export async function openDipendentiPdfComplessivoInNewTab(ctx: DipendentiPdfContext): Promise<void> {
  if (ctx.employees.length === 0) return;
  const { buildComplessivoPdf } = await importDipendentiPdfSections();
  const doc = await buildComplessivoPdf(ctx);
  void openPdfBlobInNewTab(
    doc.output("blob"),
    buildDipendentiPdfDownloadFileName({ monthKey: ctx.monthKey, kind: "aziendale" }),
  );
}

export async function openDipendentiPdfDipendenteInNewTab(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
): Promise<void> {
  const { buildDipendentePdf } = await importDipendentiPdfSections();
  const doc = await buildDipendentePdf(ctx, employee);
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
