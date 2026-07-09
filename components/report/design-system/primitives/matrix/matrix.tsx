"use client";

import type { ReactNode } from "react";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";

/** Matrix heat wrapper — contenuto fornito dalla sezione (dati dominio). */
export function ReportMatrix({ title, children }: { title?: string; children: ReactNode }) {
  return <ReportVisualization title={title}>{children}</ReportVisualization>;
}
