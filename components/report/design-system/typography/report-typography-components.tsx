"use client";

import type { ReactNode } from "react";
import {
  reportTypographyDescriptionClass,
  reportTypographyLabelClass,
  reportTypographySectionDescClass,
  reportTypographySectionTitleClass,
  reportTypographyValueClass,
} from "@/components/report/design-system/typography/report-typography";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";

export function ReportTypographyLabel({ children }: { children: ReactNode }) {
  return <p className={reportTypographyLabelClass}>{children}</p>;
}

export function ReportTypographyValue({
  children,
  hero,
}: {
  children: ReactNode;
  hero?: boolean;
}) {
  const { metricValueScale } = useReportDensity();
  const scale = hero ? "text-3xl sm:text-4xl" : metricValueScale;
  return <p className={`${reportTypographyValueClass} ${scale}`}>{children}</p>;
}

export function ReportTypographyDescription({ children }: { children: ReactNode }) {
  return <p className={reportTypographyDescriptionClass}>{children}</p>;
}

export function ReportSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="min-w-0">
      <h3 className={reportTypographySectionTitleClass}>{title}</h3>
      {subtitle ? <p className={reportTypographySectionDescClass}>{subtitle}</p> : null}
    </header>
  );
}
