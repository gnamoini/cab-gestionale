"use client";

import type { ReactNode } from "react";
import { reportCompareBannerClass } from "@/components/report/report-ui-tokens";

export function ReportCompareBanner({ children }: { children: ReactNode }) {
  return (
    <div className={reportCompareBannerClass} role="note">
      {children}
    </div>
  );
}
