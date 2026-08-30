"use client";

import dynamic from "next/dynamic";

const ReportDesignSystemPreviewDev = dynamic(
  () => import("@/app/(gestionale)/report/design-system-preview/report-design-system-preview-dev"),
);

export default function ReportDesignSystemPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6 text-sm text-[color:var(--cab-text-muted)]">
        Preview design system disponibile solo in ambiente di sviluppo.
      </div>
    );
  }

  return <ReportDesignSystemPreviewDev />;
}
