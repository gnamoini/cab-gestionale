"use client";

import {
  buildDipendentiPdfContext,
  type DipendentiPdfContext,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";

export { buildDipendentiPdfContext };
export type { DipendentiPdfContext };

export async function openDipendentiPdfComplessivoInNewTab(ctx: DipendentiPdfContext): Promise<void> {
  if (ctx.employees.length === 0) return;
  openPdfArtifact("dipendenti-aziendale", { month: ctx.monthKey });
}

export async function openDipendentiPdfDipendenteInNewTab(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
): Promise<void> {
  openPdfArtifact("dipendenti-dipendente", { month: ctx.monthKey, employeeId: employee.id });
}
