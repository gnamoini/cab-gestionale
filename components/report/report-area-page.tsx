"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { ReportPageStructure } from "@/components/report/report-page-structure";
import type { ReportHubAreaId } from "@/lib/report/report-hub-areas-config";

const ReportAreaDataShell = dynamic(
  () => import("@/components/report/report-area-data-shell").then((m) => ({ default: m.ReportAreaDataShell })),
  { loading: () => <ReportPageStructure mode="skeleton" scope="content" /> },
);

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
