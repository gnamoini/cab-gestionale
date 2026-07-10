"use client";

import type { ReactNode } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { reportSubsectionShellClass } from "@/components/report/report-ui-tokens";

/** Blocco collassabile (chevron) dentro una sezione report. */
export function ReportSubsection({
  id,
  title,
  subtitle,
  defaultCollapsed = false,
  headerActions,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  defaultCollapsed?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ShellCard
      id={id}
      title={title}
      subtitle={subtitle}
      collapsible
      collapsibleInset
      defaultCollapsed={defaultCollapsed}
      persistScope={id ? "report" : undefined}
      persistKey={id}
      compactHeader
      headerActions={headerActions}
      className={`${reportSubsectionShellClass} ${className}`.trim()}
    >
      {children}
    </ShellCard>
  );
}
