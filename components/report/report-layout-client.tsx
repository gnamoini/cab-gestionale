"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReportWorkspaceShell } from "@/components/report/report-workspace-shell";
import { ReportPageStructure } from "@/components/report/report-page-structure";

function ReportLayoutSuspenseFallback() {
  const pathname = usePathname();
  const variant = pathname === "/report" ? "hub" : "area";
  return <ReportPageStructure mode="skeleton" variant={variant} />;
}

export function ReportLayoutClient({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ReportLayoutSuspenseFallback />}>
      <ReportWorkspaceShell>{children}</ReportWorkspaceShell>
    </Suspense>
  );
}
