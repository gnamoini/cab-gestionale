"use client";

import type { ComponentType, ReactNode } from "react";
import { ReportAreaDataShell } from "@/components/report/report-area-data-shell";
import type { ReportHubAreaId } from "@/lib/report/report-hub-areas-config";

export function ReportAreaPage({
  areaId,
  children,
  showAskButton = true,
}: {
  areaId: ReportHubAreaId;
  children: ReactNode;
  showAskButton?: boolean;
}) {
  return (
    <ReportAreaDataShell areaId={areaId} showAskButton={showAskButton}>
      {children}
    </ReportAreaDataShell>
  );
}

export function reportAreaPage(View: ComponentType, areaId: ReportHubAreaId, options?: { showAskButton?: boolean }) {
  return function AreaPage() {
    return (
      <ReportAreaPage areaId={areaId} showAskButton={options?.showAskButton ?? true}>
        <View />
      </ReportAreaPage>
    );
  };
}
