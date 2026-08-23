import type { ReactNode } from "react";
import { ReportLayoutClient } from "@/components/report/report-layout-client";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <ReportLayoutClient>{children}</ReportLayoutClient>;
}
